'use strict';
// KING MD - main.js - FULL FIXED ✅
// FIXED: Added POST /api/channel-react BEFORE 404 handler
// 1. Channel NOT hardcoded - reads from config.js
// 2. Pairing code = KINGMD + 2 different random numbers - e.g. KINGMD25

// ===== 1. LIBS / SETTINGS =====
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function safeRequire(p) { try { return require(p); } catch (e) { console.log('[KING MD] Skip lib', p, '-', e.message); return null; } }

const settings = safeRequire('./settings');
const config = safeRequire('./config.js');
const isBanned = safeRequire('./lib/isBanned');
const ytSearch = safeRequire('yt-search');
const myfunc = safeRequire('./lib/myfunc');
const fetch = safeRequire('node-fetch') || global.fetch;
const ytdl = safeRequire('ytdl-core');
const axios = safeRequire('axios');
const ffmpeg = safeRequire('fluent-ffmpeg');
const libIndex = safeRequire('./lib/index');
const isAdmin = safeRequire('./lib/isAdmin');
const antilinkLib = safeRequire('./lib/antilink');
const antibadwordLib = safeRequire('./lib/antibadword');
const reactionsLib = safeRequire('./lib/reactions');
const antilinkSettingsFile = path.join(__dirname, 'data', 'antilink.json');
const antideleteSettingsFile = path.join(__dirname, 'data', 'antidelete.json');
const recentMessages = new Map();
function readJsonObject(file) { try { const value = JSON.parse(fs.readFileSync(file, 'utf8')); return value && typeof value === 'object' ? value : {}; } catch (_) { return {}; } }
function getTextFromMessage(message) { const m = message?.message || {}; return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || m.documentMessage?.caption || ''; }
async function isGroupAdmin(sock, jid, participant) { try { const md = await sock.groupMetadata(jid); return (md.participants || []).some(p => p.id === participant && (p.admin === 'admin' || p.admin === 'superadmin')); } catch (_) { return false; } }
async function processGroupProtection(sock, message) {
  const jid = message?.key?.remoteJid; if (!jid || !jid.endsWith('@g.us') || message.key.fromMe) return;
  const sender = message.key.participant || ''; const text = getTextFromMessage(message);
  if (text) {
    const anti = readJsonObject(antilinkSettingsFile);
    if (anti[jid] && /(https?:\/\/|www\.|chat\.whatsapp\.com\/|whatsapp\.com\/channel\/)/i.test(text) && !(await isGroupAdmin(sock, jid, sender))) {
      try { await sock.sendMessage(jid, { delete: message.key }); await sock.sendMessage(jid, { text: '🔗 Link removed by KING MD (antilink).' }); } catch (e) { console.error('[KING MD] Antilink delete failed:', e.message); }
      return;
    }
  }
  const id = message.key.id; if (id) { recentMessages.set(id, { jid, sender, message: message.message, text, at: Date.now() }); if (recentMessages.size > 1500) recentMessages.delete(recentMessages.keys().next().value); }
}
async function processAntiDelete(sock, message) {
  const protocol = message?.message?.protocolMessage; if (!protocol) return;
  const type = protocol.type; const isRevoke = type === 0 || type === 'REVOKE' || String(type).toUpperCase().includes('REVOKE');
  if (!isRevoke) return;
  const target = protocol.key; if (!target?.id) return;
  const old = recentMessages.get(target.id); if (!old) return;
  const enabled = readJsonObject(antideleteSettingsFile); if (!enabled[old.jid]) return;
  const who = old.sender ? `@${old.sender.split('@')[0]}` : 'Unknown';
  const body = old.text || (old.message?.imageMessage ? '[Image]' : old.message?.videoMessage ? '[Video]' : old.message?.audioMessage ? '[Audio]' : old.message?.documentMessage ? '[Document]' : '[Message content unavailable]');
  try { await sock.sendMessage(old.jid, { text: `🗑️ *KING MD ANTIDELETE*\nDeleted by: ${who}\n\n${String(body).slice(0, 3500)}`, mentions: old.sender ? [old.sender] : [] }); } catch (e) { console.error('[KING MD] Antidelete notify failed:', e.message); }
  recentMessages.delete(target.id);
}

console.log('[KING MD] Libs loaded - settings:', !!settings, 'config:', !!config);

// ===== 2. PAIRING ENGINE SETUP =====
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const baileys = require('@whiskeysockets/baileys');

const makeWASocket = baileys.default || baileys.makeWASocket;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const DisconnectReason = baileys.DisconnectReason || { loggedOut: 401 };
const Browsers = baileys.Browsers;

const WA_WEB_VERSION = String(process.env.WA_WEB_VERSION || '2.3000.1053060988').split('.').map(Number);
const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));
const PORT = Number(process.env.PORT || 10000);
const SESSION_DIR = process.env.PAIR_SESSION_DIR || path.join(__dirname, 'pair_sessions');
const BRIDGE_KEY = process.env.PAIR_BRIDGE_KEY || 'uFOg2BeCn3EJV6tf1fdXbsMSwshScKuzFDQwvoh68jx59ftO';

const CHANNEL = config?.channel || config?.channelLink || process.env.CHANNEL_LINK || '';
const CHANNEL_INVITE = config?.channelInvite || config?.channelCode || process.env.CHANNEL_INVITE || '';
const WEBSITE = config?.website || process.env.WEBSITE || '';
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
fs.mkdirSync(SESSION_DIR, { recursive: true });

function makeKingCode() {
  const d1 = crypto.randomInt(0, 10);
  let d2 = crypto.randomInt(0, 10);
  while (d1 === d2) d2 = crypto.randomInt(0, 10);
  return `KINGMD${d1}${d2}`;
}

async function autoFollowChannel(sock) {
  try {
    if (!CHANNEL_INVITE) { console.log('[KING MD] No channel invite in config, skip auto-follow'); return; }
    const meta = await sock.newsletterMetadata('invite', CHANNEL_INVITE);
    const channelJid = meta?.id;
    if (!channelJid) return;
    await sock.newsletterFollow(channelJid);
    console.log('[KING MD] ✅ Auto-followed channel!');
    try { await sock.newsletterFetch(channelJid); } catch (e) {}
  } catch (e) { console.log('[KING MD] Auto-follow failed:', e.message); }
}

// ===== 3. COMMANDS (AUTO-DISCOVERY) =====
// Every .js file placed in ./commands is loaded automatically.
// New commands do not need another addCmd(...) line in this file.
const commandModules = new Map();
const commandAliases = new Map();
const commandDirectory = path.join(__dirname, 'commands');

function resolveCommandHandler(mod) {
  if (typeof mod === 'function') return mod;
  if (!mod || typeof mod !== 'object') return null;
  for (const key of ['execute', 'handler', 'run', 'command', 'default']) {
    if (typeof mod[key] === 'function') return mod[key];
  }
  return null;
}

function addCmd(name, mod, fileName = '') {
  const handler = resolveCommandHandler(mod);
  if (!handler) return false;
  const canonical = String(name || fileName).toLowerCase().replace(/\.js$/i, '').trim();
  if (!canonical) return false;
  commandModules.set(canonical, handler);
  const aliases = Array.isArray(mod?.aliases) ? mod.aliases : Array.isArray(handler.aliases) ? handler.aliases : [];
  for (const alias of aliases) {
    const key = String(alias).toLowerCase().trim();
    if (key && !commandAliases.has(key)) commandAliases.set(key, canonical);
  }
  return true;
}

function loadCommands() {
  let files = [];
  try {
    files = fs.readdirSync(commandDirectory)
      .filter(file => file.endsWith('.js') && file !== '.js')
      .sort();
  } catch (error) {
    console.error('[KING MD] Cannot read commands directory:', error.message);
    return;
  }
  for (const file of files) {
    const commandName = path.basename(file, '.js').toLowerCase();
    try {
      const absolutePath = path.join(commandDirectory, file);
      delete require.cache[require.resolve(absolutePath)];
      const mod = require(absolutePath);
      if (!addCmd(commandName, mod, file)) {
        console.warn(`[KING MD] Skipped ${file}: no exported command handler`);
      }
    } catch (error) {
      console.error(`[KING MD] Failed loading ${file}:`, error.message);
    }
  }
  // Friendly built-in aliases.
  for (const [alias, target] of Object.entries({ menu: 'help', ply: 'play', pl: 'play', vv: 'viewonce', '8ball': 'eightball' })) {
    if (commandModules.has(target) && !commandAliases.has(alias)) commandAliases.set(alias, target);
  }
  console.log(`[KING MD] Auto-loaded ${commandModules.size} commands: ${[...commandModules.keys()].join(', ')}`);
}
loadCommands();

function getMessageText(message) {
  const msg = message?.message || {};
  return msg.conversation || msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption || msg.videoMessage?.caption ||
    msg.documentMessage?.caption || msg.buttonsResponseMessage?.selectedButtonId ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId || '';
}

async function runCommand(sock, message) {
  const rawText = getMessageText(message);
  if (!rawText || !message?.key?.remoteJid || message.key.fromMe) return;
  const trimmed = rawText.trim();
  const configuredPrefix = String(config?.prefix || settings?.prefix || '.');
  const prefixes = [...new Set([configuredPrefix, '.', '!'].filter(Boolean))];
  const prefix = prefixes.find(value => trimmed.startsWith(value));
  if (!prefix) return;

  const parts = trimmed.slice(prefix.length).trim().split(/\s+/);
  const requestedName = (parts.shift() || '').toLowerCase();
  if (!requestedName) return;
  const cmdName = commandAliases.get(requestedName) || requestedName;
  const handler = commandModules.get(cmdName);
  const from = message.key.remoteJid;
  const args = parts;
  const extra = {
    text: rawText, args, from, channel: CHANNEL, channelInvite: CHANNEL_INVITE,
    website: WEBSITE, settings, config, ytSearch, axios, ytdl, ffmpeg, fetch,
    command: cmdName, prefix, commands: [...commandModules.keys()], downloadMediaMessage: baileys.downloadMediaMessage
  };

  if (!handler) {
    await sock.sendMessage(from, {
      text: `❌ Unknown command: *${requestedName}*\n\nSend *.menu* to see the commands currently installed.`
    }, { quoted: message }).catch(() => {});
    return;
  }

  console.log('[KING MD] Running:', cmdName);
  try {
    if (typeof sock.sendPresenceUpdate === 'function') await sock.sendPresenceUpdate('composing', from).catch(() => {});
    // song.js uses the legacy (sock, chatId, message, extra) signature.
    if (cmdName === 'song') await handler(sock, from, message, extra);
    else await handler(sock, message, extra);
  } catch (error) {
    console.error(`[KING MD] Command .${cmdName} failed:`, error.stack || error.message || error);
    await sock.sendMessage(from, {
      text: `❌ *KING MD*\nThe .${cmdName} command failed. Please try again later.`
    }, { quoted: message }).catch(() => {});
  } finally { if (typeof sock.sendPresenceUpdate === 'function') await sock.sendPresenceUpdate('paused', from).catch(() => {}); }
}

// ===== 4. PAIRING ENGINE =====
const sessions = new Map();
const pending = new Map();
const phoneDigits = v => String(v || '').replace(/\D/g, '');
const sessionPath = phone => path.join(SESSION_DIR, crypto.createHash('sha256').update(phone).digest('hex'));
const stateFor = phone => { const s = sessions.get(phone); if (!s) return 'offline'; if (s.connected) return 'online'; if (s.pairing) return 'pairing'; return s.loggedOut ? 'offline' : 'connecting'; };
function getBridgeKeyFromReq(req) { return req.get('x-pair-bridge-key') || req.get('x-bridge-key') || req.get('x-api-key') || String(req.get('authorization') || '').replace(/^Bearer\s+/i, '') || ''; }
function bridgeAuth(req, res, next) { if (!BRIDGE_KEY || getBridgeKeyFromReq(req) !== BRIDGE_KEY) return res.status(401).json({ success: false, error: 'Unauthorized' }); next(); }

async function startSocket(phone, opts = {}) {
  const dir = sessionPath(phone);
  fs.mkdirSync(dir, { recursive: true });
  try { await fs.promises.writeFile(path.join(dir, 'phone.json'), JSON.stringify({ phone })); } catch(e){}
  const auth = await useMultiFileAuthState(dir);
  const sock = makeWASocket({ auth: auth.state, version: WA_WEB_VERSION, logger, printQRInTerminal: false, browser: Browsers && Browsers.macOS ? Browsers.macOS('Chrome') : ['KING MD', 'Chrome', '1.0.0'], syncFullHistory: false, markOnlineOnConnect: false, generateHighQualityLinkPreview: false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 25000 });
  const entry = { phone, sock, connected: false, pairing: false, loggedOut: false, code: null, kingCode: null, updatedAt: Date.now(), reconnectAttempts: 0, reconnectTimer: null };
  const old = sessions.get(phone);
  if (old?.reconnectTimer) clearTimeout(old.reconnectTimer);
  sessions.set(phone, entry);
  sock.ev.on('creds.update', () => { auth.saveCreds().catch(e => console.error(e.message)); });
  sock.ev.on('messages.upsert', async chatUpdate => {
    const { messages } = chatUpdate || {};
    if (!Array.isArray(messages)) return;
    for (const message of messages) {
      if (!message?.key?.remoteJid || !message.message) continue;
      try { await processAntiDelete(sock, message); await processGroupProtection(sock, message); await runCommand(sock, message); } catch (e) { console.error('[KING MD] Message handler:', e.stack || e.message); }
    }
  });
  sock.ev.on('connection.update', update => {
    entry.updatedAt = Date.now();
    if (update.connection === 'open') {
        entry.connected = true; entry.pairing = false; entry.code = null; entry.kingCode = null; entry.loggedOut = false; entry.reconnectAttempts = 0;
        console.log('[KING MD] OPEN:', phone);
        if (typeof sock.sendPresenceUpdate === 'function') sock.sendPresenceUpdate('available').catch(() => {});
        const ownerDigits = String(config?.ownerNumber || config?.phoneNumber || '').replace(/\D/g, '');
        if (ownerDigits) sock.sendMessage(`${ownerDigits}@s.whatsapp.net`, { text: '👑 *KING MD IS ACTIVE* 🟢\nWhatsApp connection is ready.\nType *.menu* in any chat to view the commands currently installed.' }).catch(e => console.log('[KING MD] Owner active notice skipped:', e.message));
        autoFollowChannel(sock);
    }
    if (update.connection === 'close') {
      entry.connected = false; entry.pairing = false;
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      entry.loggedOut = statusCode === DisconnectReason.loggedOut;
      if (statusCode === 405) return;
      if (!entry.loggedOut && sessions.get(phone) === entry && !entry.reconnectTimer) {
        const attempt = (entry.reconnectAttempts || 0) + 1; entry.reconnectAttempts = attempt;
        const delay = Math.min(15000, 1500 * attempt);
        entry.reconnectTimer = setTimeout(async () => { entry.reconnectTimer = null; if (sessions.get(phone) !== entry) return; try { await startSocket(phone, { requestCode: false }); } catch (e) { console.error(e.message); } }, delay);
      }
    }
  });
  if (opts.requestCode && !auth.state.creds.registered) {
    await new Promise(r => setTimeout(r, 3000));
    const code = await sock.requestPairingCode(phone);
    entry.code = String(code || '').replace(/[^A-Za-z0-9-]/g, '');
    entry.kingCode = makeKingCode();
    entry.pairing = true; entry.updatedAt = Date.now();
    console.log(`[KING MD] Pair for ${phone} -> Real: ${entry.code} | Display: ${entry.kingCode}`);
    return { entry, code: entry.code, kingCode: entry.kingCode };
  }
  return { entry, code: null, kingCode: null };
}

// ===== HELPER: Find channel JID from any link format =====
async function resolveChannelJid(sock, link) {
  const raw = String(link || '').trim();
  // Format 1: https://whatsapp.com/channel/0029Va...
  // Format 2: 0029Va...
  // Format 3: https://whatsapp.com/channel/xxxx (invite code)
  let id = raw;
  if (raw.includes('/channel/')) id = raw.split('/channel/')[1].split(/[?\/\s]/)[0];
  id = id.trim();
  if (!id) return null;
  // If it looks like a JID already: 120207...@newsletter
  if (id.includes('@newsletter')) return id;
  // If it looks like a real channel ID (starts with 120207 or 0029...)
  // Try direct: Baileys can fetch by ID
  try {
    const meta = await sock.newsletterMetadata('jid', id.includes('@') ? id : id + '@newsletter');
    if (meta?.id) return meta.id;
  } catch (_) {}
  // Try as invite code
  try {
    const meta2 = await sock.newsletterMetadata('invite', id);
    if (meta2?.id) return meta2.id;
  } catch (_) {}
  // Fallback: if starts with 0029, it IS the invite - construct jid guess
  // Baileys newsletterFetch needs real JID, so return invite for follow attempt
  return { invite: id };
}

// ===== WEB ROUTES =====
app.get('/', (_req, res) => res.send(`<h1>👑 KING MD V4 ONLINE</h1><p>Website: ${WEBSITE}</p><p>Status: <a href="/health">/health</a></p><p>Bots: ${sessions.size}</p>`));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'KING MD', website: WEBSITE, activeSessions: sessions.size, uptime: Math.floor(process.uptime()) }));
app.get('/api/pair', (_req, res) => res.json({ success: false, error: 'Use POST /api/pair' }));

app.post('/api/pair', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter valid number' });
  if (pending.has(phone)) {
    try {
      const r = await pending.get(phone);
      return res.json({ success: true, pairingCode: r.code, kingCode: r.kingCode, kingMdCode: r.kingCode, displayCode: r.kingCode, state: stateFor(phone) });
    } catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  }
  const task = (async () => {
    const cur = sessions.get(phone);
    if (cur?.pairing && cur.code) {
      if (!cur.kingCode) cur.kingCode = makeKingCode();
      return { code: cur.code, kingCode: cur.kingCode };
    }
    if (cur?.sock) { try { cur.sock.end(undefined); } catch (_) {} sessions.delete(phone); }
    const result = await startSocket(phone, { requestCode: true });
    if (!result.code) throw new Error('No pairing code');
    return { code: result.code, kingCode: result.kingCode };
  })();
  pending.set(phone, task);
  try {
    const r = await task;
    return res.json({ success: true, pairingCode: r.code, kingCode: r.kingCode, kingMdCode: r.kingCode, displayCode: r.kingCode, state: stateFor(phone) });
  } catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  finally { pending.delete(phone); }
});

app.get('/api/status', (req, res) => { const numbers = String(req.query.numbers || req.query.number || '').split(',').map(phoneDigits).filter(n => /^\d{8,15}$/.test(n)); const bots = {}; numbers.forEach(n => { const s = sessions.get(n); bots[n] = { state: stateFor(n), connected: Boolean(s?.connected), kingCode: s?.kingCode || null }; }); res.json({ success: true, bots }); });

app.delete('/api/session/:phone', bridgeAuth, async (req, res) => { const phone = phoneDigits(req.params.phone); const cur = sessions.get(phone); if (cur?.sock) { try { await cur.sock.logout(); } catch (_) { try { cur.sock.end(undefined); } catch (_) {} } } sessions.delete(phone); await fs.promises.rm(sessionPath(phone), { recursive: true, force: true }); res.json({ success: true, state: 'offline' }); });

// ===== ✅ CHANNEL REACT - THIS WAS MISSING! MUST BE BEFORE 404! =====
app.post('/api/channel-react', bridgeAuth, async (req, res) => {
  const { link, emoji, amount, phoneNumbers } = req.body || {};
  if (!link) return res.status(400).json({ success: false, error: 'Missing channel link' });
  console.log('[KING MD] Channel-React request:', link, 'phones:', phoneNumbers, 'amount:', amount);

  // 1. Pick sock: try requested phones first, then any online
  let sock = null;
  let usedPhone = null;
  const candidates = (Array.isArray(phoneNumbers) ? phoneNumbers : []).map(phoneDigits).filter(Boolean);
  for (const ph of candidates) {
    const e = sessions.get(ph);
    if (e?.connected && e.sock) { sock = e.sock; usedPhone = ph; break; }
  }
  if (!sock) {
    for (const e of sessions.values()) { if (e.connected && e.sock) { sock = e.sock; usedPhone = e.phone; break; } }
  }
  if (!sock) return res.status(409).json({ success: false, error: 'No bot online. Pair your bot first, then try again.' });

  try {
    // 2. Resolve channel JID
    const resolved = await resolveChannelJid(sock, link);
    if (!resolved) return res.status(400).json({ success: false, error: 'Channel not found. Check link.' });
    let channelJid = typeof resolved === 'string' ? resolved : null;
    if (!channelJid && resolved.invite) {
      // Need to follow first to get JID
      try {
        const meta = await sock.newsletterMetadata('invite', resolved.invite);
        channelJid = meta?.id;
        if (channelJid) { try { await sock.newsletterFollow(channelJid); } catch (_) {} }
      } catch (e) { console.log('[KING MD] Invite resolve fail:', e.message); }
    }
    if (!channelJid) return res.status(400).json({ success: false, error: 'Could not find channel. Make sure bot follows it. Open WhatsApp on bot number > Channels > Follow this channel, then try again.' });

    // 3. Ensure bot follows channel
    try { await sock.newsletterFollow(channelJid); } catch (_) {}
    try { await sock.newsletterFetch(channelJid); } catch (_) {}

    // 4. React!
    const EMOJIS = ['❤️','🔥','👍','😂','😮','😢','🙏'];
    const total = Math.max(1, Math.min(Number(amount) || 1, 10));
    let sent = 0;
    let lastErr = '';
    for (let i = 0; i < total; i++) {
      const e = emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      try {
        // Baileys: newsletterReact(jid, emoji)
        if (typeof sock.newsletterReact === 'function') {
          await sock.newsletterReact(channelJid, e);
        } else if (typeof sock.newsletterReactMessage === 'function') {
          await sock.newsletterReactMessage(channelJid, e);
        } else {
          throw new Error('newsletterReact not available in this Baileys version');
        }
        sent++;
        console.log(`[KING MD] React ${sent}/${total} ${e} on ${channelJid} via ${usedPhone}`);
      } catch (err) {
        lastErr = err.message || String(err);
        console.log('[KING MD] React fail:', lastErr);
      }
      if (i < total - 1) await new Promise(r => setTimeout(r, 900));
    }

    if (!sent) return res.status(500).json({ success: false, error: 'Engine failed to react: ' + lastErr + '. Make sure YOUR bot follows that Channel first!' });
    return res.json({ success: true, reactionsSent: sent, sent, usedPhone, channelJid });
  } catch (e) {
    console.log('[KING MD] Channel-react error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ===== 404 + error handler - MUST BE LAST! =====
app.use((req, res) => res.status(404).json({ success: false, error: 'Not found: ' + req.path }));
app.use((err, req, res, next) => { console.log('[KING MD] Express error:', err.message); res.status(500).json({ success: false, error: err.message }); });

async function restoreSessions() {
  const dirs = await fs.promises.readdir(SESSION_DIR, { withFileTypes: true }).catch(() => []);
  for (const item of dirs) {
    if (!item.isDirectory()) continue;
    try {
      const meta = JSON.parse(await fs.promises.readFile(path.join(SESSION_DIR, item.name, 'phone.json'), 'utf8'));
      const creds = JSON.parse(await fs.promises.readFile(path.join(SESSION_DIR, item.name, 'creds.json'), 'utf8'));
      if (phoneDigits(meta.phone) && creds.registered) await startSocket(phoneDigits(meta.phone), { requestCode: false });
    } catch (_) {}
  }
}

setInterval(() => { console.log('[KING MD] Still awake 👑 Uptime:', Math.floor(process.uptime()), 's'); }, 30000);
setInterval(async () => {
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;
  if (!selfUrl) return;
  try { const r = await fetch(selfUrl + '/health'); console.log('[KING MD] Self-ping:', r.status); } catch (e) { console.log('[KING MD] Self-ping fail:', e.message); }
}, 4 * 60 * 1000);
process.on('uncaughtException', e => console.log('[KING MD] Uncaught:', e.message));
process.on('unhandledRejection', e => console.log('[KING MD] Rejection:', e?.message));

app.listen(PORT, '0.0.0.0', () => {
  console.log('[KING MD] Listening on ' + PORT + ' | Website: ' + WEBSITE);
  restoreSessions().catch(e => console.log('[KING MD] Restore failed:', e.message));
});

module.exports = { sessions, commandModules, handleMessages: runCommand, settings, config, makeKingCode };
