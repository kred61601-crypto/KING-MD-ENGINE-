This is main.js do you see 'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function safeRequire(p) { try { return require(p); } catch (e) { console.log('[KING MD] Skip lib', p, '-', e.message); return null; } }

const settings = safeRequire('./settings');
const config = safeRequire('./config.js');
const isBanned = safeRequire('./lib/isBanned');
// FAST: Heavy libs are LAZY - loaded only when a command needs them
let _ytSearch = null, _ytdl = null, _ffmpeg = null, _axios = null;
const ytSearch = (...a) => (_ytSearch ??= safeRequire('yt-search'))?.(...a);
const ytdl = new Proxy({}, { get: (_, k) => (_ytdl ??= safeRequire('ytdl-core'))?.[k] });
const ffmpeg = (...a) => (_ffmpeg ??= safeRequire('fluent-ffmpeg'))?.(...a);
const axios = new Proxy({}, { get: (_, k) => (_axios ??= safeRequire('axios'))?.[k] });
const myfunc = safeRequire('./lib/myfunc');
const fetch = safeRequire('node-fetch') || global.fetch;
const libIndex = safeRequire('./lib/index');
const isAdmin = safeRequire('./lib/isAdmin');
const antilinkLib = safeRequire('./lib/antilink');
const antibadwordLib = safeRequire('./lib/antibadword');
const reactionsLib = safeRequire('./lib/reactions');

console.log('[KING MD] Libs loaded - settings:', !!settings, 'config:', !!config);

const MANAGE_FILE = path.join(__dirname, 'manage-passwords.json');
function makeManagePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}
function loadManagePasswords() {
  try { if (fs.existsSync(MANAGE_FILE)) return JSON.parse(fs.readFileSync(MANAGE_FILE, 'utf8')); } catch (_) {}
  return {};
}
function saveManagePassword(phone, password) {
  const db = loadManagePasswords();
  db[phone] = { botNumber: phone, password, createdAt: Date.now() };
  fs.writeFileSync(MANAGE_FILE, JSON.stringify(db, null, 2));
  return db[phone];
}
function getManagePassword(phone) {
  const db = loadManagePasswords();
  return db[phone] || null;
}
function deleteManagePassword(phone) {
  const db = loadManagePasswords();
  delete db[phone];
  fs.writeFileSync(MANAGE_FILE, JSON.stringify(db, null, 2));
}

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
    if (!CHANNEL_INVITE) return;
    const meta = await sock.newsletterMetadata('invite', CHANNEL_INVITE);
    const channelJid = meta?.id;
    if (!channelJid) return;
    await sock.newsletterFollow(channelJid);
    console.log('[KING MD] ✅ Auto-followed channel!');
    try { await sock.newsletterFetch(channelJid); } catch (e) {}
  } catch (e) { console.log('[KING MD] Auto-follow failed:', e.message); }
}

async function sendPrivateWelcome(sock, phone) {
  try {
    let saved = getManagePassword(phone);
    let password = saved?.password;
    if (!password) { password = makeManagePassword(); saveManagePassword(phone, password); }
    console.log(`[KING MD] Manage password for ${phone}: ${password}`);
    const welcome = `╭──────────────────❍\n│ 👋 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎\n│ 👑🔥𝐊𝐈𝐍𝐆-𝐌𝐃-𝐕4🔥👑\n╰──────────────────❍\n\n*🤖 Your bot has been connected successfully and is now online ✅.*\n\n- \`Type .menu to view all commands\`\n- \`Type .settings to check current settings\`\n\n*📱 Bot Number*\n└➤ +${phone}\n\n*🔐 Manage-Bot Password*\n└➤ \`${password}\`\n\n*🌐 Bot Control Panel*\n└➤ ${WEBSITE || 'https://your-kingmd-panel/settings'}\n━━━━━━━━━━━━━━━━\n\n*📍 How to Manage Your Bot*\n- Open the website\n- Tap ☰ Menu\n- Select Manage Bot\n- Enter your password\n━━━━━━━━━━━━━━━━\n\n*💡 ꜰᴏʀɢᴏᴛ ʏᴏᴜʀ ᴘᴀssᴡᴏʀᴅ?*\nsɪᴍᴘʟʏ ᴛʏᴘᴇ *.ᴘᴀssᴡᴏʀᴅ* ᴀɴᴅ ʏᴏᴜʀ ᴘᴀssᴡᴏʀᴅ ᴡɪʟʟ ʙᴇ ᴅᴇʟɪᴠᴇʀᴇᴅ ᴘʀɪᴠᴀᴛᴇʟʏ.\n\n━━━━━━━━━━━━━━━━\n*⚠️ 𝐒ᴇᴄᴜʀɪᴛʏ 𝐍ᴏᴛɪᴄᴇ*\nᴋᴇᴇᴘ ʏᴏᴜʀ ᴘᴀssᴡᴏʀᴅ ᴘʀɪᴠᴀᴛᴇ. ꜰᴏʀ ʏᴏᴜʀ sᴀꜰᴇᴛʏ, ɪᴛ ᴡɪʟʟ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ᴇxᴘɪʀᴇ ᴡʜᴇɴ ᴛʜɪs ʙᴏᴛ ʟᴏɢs ᴏᴜᴛ.\n━━━━━━━━━━━━━━━━`;
    const myJid = phone + '@s.whatsapp.net';
    const imagePaths = [path.join(__dirname, 'assets', 'welcome.jpg'), path.join(__dirname, 'assets', 'welcome.png'), path.join(__dirname, 'assets', 'welcome.jpeg'), path.join(__dirname, 'assets', 'logo.jpg'), path.join(__dirname, 'assets', 'logo.png'), path.join(__dirname, 'assets', 'menu.jpg')];
    let imageBuffer = null;
    for (const p of imagePaths) { if (fs.existsSync(p)) { imageBuffer = fs.readFileSync(p); break; } }
    if (imageBuffer) await sock.sendMessage(myJid, { image: imageBuffer, caption: welcome });
    else await sock.sendMessage(myJid, { text: welcome });
    console.log('[KING MD] ✅ Private welcome sent to', phone);
  } catch (e) { console.log('[KING MD] Welcome failed:', e.message); }
}

const viewOnceCache = new Map();
function unwrapViewOnce(m) {
  if (!m) return null;
  if (m.viewOnceMessage?.message) return m.viewOnceMessage.message;
  if (m.viewOnceMessageV2?.message) return m.viewOnceMessageV2.message;
  if (m.viewOnceMessageV2Extension?.message) return m.viewOnceMessageV2Extension.message;
  if (m.ephemeralMessage?.message) return unwrapViewOnce(m.ephemeralMessage.message);
  if (m.imageMessage || m.videoMessage || m.audioMessage) return m;
  return null;
}
function cacheViewOnce(msg) {
  try {
    const inner = unwrapViewOnce(msg.message);
    if (!inner) return;
    if (!inner.imageMessage && !inner.videoMessage && !inner.audioMessage) return;
    const key = (msg.key.remoteJid || '') + '|' + (msg.key.id || '');
    viewOnceCache.set(key, { inner, from: msg.key.remoteJid, participant: msg.key.participant || msg.key.remoteJid, id: msg.key.id });
    setTimeout(() => viewOnceCache.delete(key), 10 * 60 * 1000);
  } catch (_) {}
}
function isOnlyEmoji(text) {
  const t = String(text || '').trim();
  if (!t || t.startsWith('.') || t.startsWith('!')) return false;
  if (t.length > 20) return false;
  const noEmoji = t.replace(/[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
  return noEmoji.length === 0;
}
function getQuotedViewOnce(msg) {
  try {
    const m = msg.message || {};
    const context = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || {};
    const quoted = context.quotedMessage;
    if (!quoted) return null;
    const inner = unwrapViewOnce(quoted);
    if (!inner) return null;
    return { inner, participant: context.participant, stanzaId: context.stanzaId };
  } catch (_) { return null; }
}
async function sendViewOnceToDM(sock, inner, senderNum, fromParticipant) {
  const ownerJid = senderNum + '@s.whatsapp.net';
  const fake = { key: { remoteJid: ownerJid, id: 'vv2-' + Date.now(), fromMe: false }, message: inner };
  let buffer = null;
  try { buffer = await baileys.downloadMediaMessage(fake, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage }); } catch (_) {}
  if (!buffer) { try { buffer = await sock.downloadMediaMessage(fake); } catch (_) {} }
  if (!buffer) return false;
  const fromNum = (fromParticipant || '').split('@')[0] || senderNum;
  if (inner.imageMessage) await sock.sendMessage(ownerJid, { image: buffer, caption: `*View Once Saved 👀*\nFrom: +${fromNum}` });
  else if (inner.videoMessage) await sock.sendMessage(ownerJid, { video: buffer, caption: `*View Once Video Saved 👀*\nFrom: +${fromNum}` });
  else if (inner.audioMessage) await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
  else return false;
  return true;
}
async function handleVV2Silent(sock, msg, phone) {
  try {
    const m = msg.message || {};
    const reaction = m.reactionMessage;
    if (reaction && reaction.text) {
      if (!isOnlyEmoji(reaction.text)) return false;
      const targetId = reaction.key?.id;
      const targetJid = reaction.key?.remoteJid || msg.key.remoteJid;
      if (!targetId) return false;
      const cached = viewOnceCache.get(targetJid + '|' + targetId);
      if (!cached) return false;
      let senderNum = phone;
      if (msg.key.remoteJid.endsWith('@g.us')) senderNum = (msg.key.participant || '').split('@')[0].split(':')[0] || phone;
      await sendViewOnceToDM(sock, cached.inner, senderNum, cached.participant);
      return true;
    }
    const text = m.conversation || m.extendedTextMessage?.text || '';
    if (!isOnlyEmoji(text)) return false;
    const found = getQuotedViewOnce(msg);
    if (found) {
      let senderNum = phone;
      if (msg.key.remoteJid.endsWith('@g.us')) senderNum = (msg.key.participant || '').split('@')[0].split(':')[0] || phone;
      else if (!msg.key.fromMe) senderNum = msg.key.remoteJid.split('@')[0].split(':')[0];
      await sendViewOnceToDM(sock, found.inner, senderNum, found.participant);
      return true;
    }
    return false;
  } catch (_) { return true; }
}

// ===== FAST COMMANDS - LAZY LOAD =====
const commandModules = new Map(); // loaded handlers only
const commandAliases = new Map();
const commandFiles = new Map(); // name -> file path (NOT loaded yet)
const commandDirectory = path.join(__dirname, 'commands');
function resolveCommandHandler(mod) {
  if (typeof mod === 'function') return mod;
  if (!mod || typeof mod !== 'object') return null;
  for (const key of ['execute', 'handler', 'run', 'command', 'default']) if (typeof mod[key] === 'function') return mod[key];
  return null;
}
function loadCommandList() {
  let files = [];
  try { files = fs.readdirSync(commandDirectory).filter(f => f.endsWith('.js') && f !== '.js').sort(); } catch (e) { console.error('[KING MD] Cannot read commands:', e.message); return; }
  for (const file of files) {
    const name = path.basename(file, '.js').toLowerCase();
    commandFiles.set(name, path.join(commandDirectory, file));
    commandModules.set(name, null); // placeholder, not loaded yet
  }
  for (const [alias, target] of Object.entries({ ply: 'play', pl: 'play', vv: 'vv2', viewonce: 'vv2', view: 'vv2', '8ball': 'eightball' })) {
    if (commandFiles.has(target) && !commandAliases.has(alias) && !commandFiles.has(alias)) commandAliases.set(alias, target);
  }
  console.log(`[KING MD] Found ${commandFiles.size} commands (lazy - loads on first use)`);
}
loadCommandList();
function getCommandHandler(name) {
  const cached = commandModules.get(name);
  if (typeof cached === 'function') return cached;
  const file = commandFiles.get(name);
  if (!file) return null;
  try {
    const mod = require(file);
    const handler = resolveCommandHandler(mod);
    if (!handler) return null;
    commandModules.set(name, handler);
    const rawAliases = [];
    if (Array.isArray(mod?.aliases)) rawAliases.push(...mod.aliases);
    if (Array.isArray(mod?.alias)) rawAliases.push(...mod.alias);
    if (typeof mod?.alias === 'string') rawAliases.push(mod.alias);
    if (mod?.name && String(mod.name).toLowerCase() !== name) rawAliases.push(mod.name);
    if (handler?.name && String(handler.name).toLowerCase() !== name) rawAliases.push(handler.name);
    for (const a of rawAliases) { const k = String(a).toLowerCase().trim(); if (k && !commandAliases.has(k) && !commandFiles.has(k)) commandAliases.set(k, name); }
    return handler;
  } catch (e) { console.error(`[KING MD] Failed loading ${name}:`, e.message); return null; }
}
function getMessageText(message) {
  const msg = message?.message || {};
  return msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.documentMessage?.caption || msg.buttonsResponseMessage?.selectedButtonId || msg.listResponseMessage?.singleSelectReply?.selectedRowId || '';
}
async function sendBuiltInMenu(sock, from, message, prefix) {
  const list = [...commandFiles.keys()].sort().map(c => `• ${prefix}${c}`).join('\n') || 'No commands loaded';
  const text = `╭──────────────────❍\n│ 👑🔥 KING-MD-V4 MENU 🔥👑\n╰──────────────────❍\n\n${list}\n\n*Total:* ${commandFiles.size} commands\n*Prefix:* ${prefix}\n*Type:* ${prefix}password for Manage password`;
  await sock.sendMessage(from, { text }, { quoted: message }).catch(() => {});
}
async function runCommand(sock, message) {
  const rawText = getMessageText(message);
  if (!rawText || !message?.key?.remoteJid) return;
  if (message.key.remoteJid === 'status@broadcast' || message.key.remoteJid.endsWith('@newsletter')) return;
  const trimmed = rawText.trim();
  const configuredPrefix = String(config?.prefix || settings?.prefix || '.');
  const prefixes = [...new Set([configuredPrefix, '.', '!'].filter(Boolean))];
  const prefix = prefixes.find(v => trimmed.startsWith(v));
  if (!prefix) return;
  const parts = trimmed.slice(prefix.length).trim().split(/\s+/);
  const requestedName = (parts.shift() || '').toLowerCase();
  if (!requestedName) return;
  const from = message.key.remoteJid;
  const args = parts;
  if ((requestedName === 'menu' || requestedName === 'help') && !commandFiles.has('menu') && !commandFiles.has('help')) {
    await sendBuiltInMenu(sock, from, message, prefix);
    return;
  }
  const cmdName = commandAliases.get(requestedName) || requestedName;
  const handler = getCommandHandler(cmdName);
  const extra = { text: rawText, args, from, channel: CHANNEL, channelInvite: CHANNEL_INVITE, website: WEBSITE, settings, config, ytSearch, axios, ytdl, ffmpeg, fetch, command: cmdName, prefix, commands: [...commandFiles.keys()], downloadMediaMessage: baileys.downloadMediaMessage };
  if (!handler) { await sock.sendMessage(from, { text: `❌ Unknown command: *${requestedName}*\n\nSend *.menu* to see commands.` }, { quoted: message }).catch(() => {}); return; }
  console.log('[KING MD] Running:', cmdName);
  try { await handler(sock, message, args, extra); }
  catch (error) { console.error(`[KING MD] Command .${cmdName} failed:`, error.stack || error.message); await sock.sendMessage(from, { text: `❌ *KING MD*\nThe .${cmdName} command failed. Try again.` }, { quoted: message }).catch(() => {}); }
}

const sessions = new Map();
const pending = new Map();
const phoneDigits = v => String(v || '').replace(/\D/g, '');
const sessionPath = phone => path.join(SESSION_DIR, crypto.createHash('sha256').update(phone).digest('hex'));
const stateFor = phone => { const s = sessions.get(phone); if (!s) return 'offline'; if (s.connected) return 'online'; if (s.pairing) return 'pairing'; return s.loggedOut ? 'offline' : 'connecting'; };
function getBridgeKeyFromReq(req) { return req.get('x-pair-bridge-key') || req.get('x-bridge-key') || req.get('x-api-key') || String(req.get('authorization') || '').replace(/^Bearer\s+/i, '') || ''; }
function bridgeAuth(req, res, next) { if (!BRIDGE_KEY || getBridgeKeyFromReq(req) !== BRIDGE_KEY) return res.status(401).json({ success: false, error: 'Unauthorized' }); next(); }

async function startSocket(phone, opts = {}) {
  const existing = sessions.get(phone);
  if (existing?.sock && existing.connected && !opts.requestCode) return { entry: existing, code: null, kingCode: null };
  const dir = sessionPath(phone);
  fs.mkdirSync(dir, { recursive: true });
  try { await fs.promises.writeFile(path.join(dir, 'phone.json'), JSON.stringify({ phone })); } catch (e) {}
  const auth = await useMultiFileAuthState(dir);
  const sock = makeWASocket({ auth: auth.state, version: WA_WEB_VERSION, logger, printQRInTerminal: false, browser: Browsers && Browsers.macOS ? Browsers.macOS('Safari') : ['KING MD', 'Safari', '1.0.0'], syncFullHistory: false, shouldSyncHistoryMessage: () => false, emitOwnEvents: false, markOnlineOnConnect: true, generateHighQualityLinkPreview: false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 15000, retryRequestDelayMs: 500, maxMsgRetryCount: 5, getMessage: async (key) => {
    try { const cached = viewOnceCache.get((key.remoteJid || '') + '|' + (key.id || '')); if (cached) return { key, message: cached.inner }; } catch (_) {}
    return undefined;
  }});
  const entry = { phone, sock, connected: false, pairing: false, loggedOut: false, code: null, kingCode: null, updatedAt: Date.now(), reconnectAttempts: 0, reconnectTimer: null };
  const old = sessions.get(phone);
  if (old?.reconnectTimer) clearTimeout(old.reconnectTimer);
  sessions.set(phone, entry);
  sock.ev.on('creds.update', () => { auth.saveCreds().catch(e => console.error(e.message)); });
  // FAST: Don't await - run messages in parallel
  sock.ev.on('messages.upsert', (chatUpdate) => {
    const { messages } = chatUpdate || {};
    if (!Array.isArray(messages)) return;
    for (const message of messages) {
      if (!message?.key?.remoteJid || !message.message) continue;
      (async () => {
        try {
          cacheViewOnce(message);
          const vvHandled = await handleVV2Silent(sock, message, phone);
          if (vvHandled) return;
          await runCommand(sock, message);
        } catch (e) { console.error(e.message); }
      })();
    }
  });
  sock.ev.on('messages.update', async (updates) => {
    for (const u of updates || []) {
      try {
        if (u.update?.status === 3 || u.update?.status === 4) continue;
        if (u.key && u.update?.message) cacheViewOnce({ key: u.key, message: u.update.message });
      } catch (_) {}
    }
  });
  sock.ev.on('connection.update', update => {
    entry.updatedAt = Date.now();
    if (update.connection === 'open') {
      entry.connected = true; entry.pairing = false; entry.code = null; entry.kingCode = null; entry.loggedOut = false; entry.reconnectAttempts = 0;
      console.log('[KING MD] OPEN:', phone);
      // FAST: Don't block on these
      autoFollowChannel(sock).catch(() => {});
      sendPrivateWelcome(sock, phone).catch(() => {});
    }
    if (update.connection === 'close') {
      entry.connected = false; entry.pairing = false;
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      entry.loggedOut = statusCode === DisconnectReason.loggedOut;
      if (statusCode === 405) return;
      if (entry.loggedOut) deleteManagePassword(phone);
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
async function resolveChannelJid(sock, link) {
  const raw = String(link || '').trim();
  let id = raw;
  if (raw.includes('/channel/')) id = raw.split('/channel/')[1].split(/[?\/\s]/)[0];
  id = id.trim();
  if (!id) return null;
  if (id.includes('@newsletter')) return id;
  try { const meta = await sock.newsletterMetadata('jid', id.includes('@') ? id : id + '@newsletter'); if (meta?.id) return meta.id; } catch (_) {}
  try { const meta2 = await sock.newsletterMetadata('invite', id); if (meta2?.id) return meta2.id; } catch (_) {}
  return { invite: id };
}

app.get('/', (_req, res) => res.send(`<h1>👑 KING MD V4 ONLINE</h1><p>Website: ${WEBSITE}</p><p>Status: <a href="/health">/health</a></p><p>Bots: ${sessions.size}</p>`));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'KING MD', website: WEBSITE, activeSessions: sessions.size, uptime: Math.floor(process.uptime()) }));
app.get('/api/pair', (_req, res) => res.json({ success: false, error: 'Use POST /api/pair' }));
app.post('/api/manage-login', async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber || req.body?.botNumber || req.body?.number);
  const password = String(req.body?.password || '').trim();
  if (!phone || !password) return res.status(400).json({ success: false, error: 'Enter bot number and password' });
  const saved = getManagePassword(phone);
  let found = saved;
  if (!found) { const all = loadManagePasswords(); for (const k of Object.keys(all)) { if (phoneDigits(k) === phone && all[k].password === password) found = all[k]; } }
  if (found && found.password === password) {
    const token = Buffer.from(phone + ':' + password).toString('base64');
    return res.json({ success: true, token, server: WEBSITE || `${req.protocol}://${req.get('host')}`, number: phone, botNumber: phone, settings: { mode: 'public', features: {} } });
  }
  return res.status(401).json({ success: false, error: 'Wrong bot number or password', attemptsLeft: 4 });
});
app.post('/api/managebot/login', async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber || req.body?.botNumber);
  const password = String(req.body?.password || '').trim();
  const saved = getManagePassword(phone);
  if (saved && saved.password === password) {
    const token = Buffer.from(phone + ':' + password).toString('base64');
    return res.json({ success: true, token, server: WEBSITE || `${req.protocol}://${req.get('host')}`, number: phone, settings: { mode: 'public', features: {} } });
  }
  return res.status(401).json({ success: false, error: 'Wrong bot number or password', attemptsLeft: 4 });
});
app.post('/api/forgot-password', async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber || req.body?.botNumber);
  const entry = sessions.get(phone);
  const saved = getManagePassword(phone);
  if (!saved) return res.status(404).json({ success: false, error: 'No password found. Connect bot first.' });
  if (entry?.sock && entry.connected) { await sendPrivateWelcome(entry.sock, phone); return res.json({ success: true, message: 'Password sent to your WhatsApp privately.' }); }
  return res.json({ success: true, message: 'Bot is offline, but password exists. Pair bot again to receive it.' });
});
app.post('/api/managebot/attempts', async (req, res) => res.json({ success: true, attemptsLeft: 5, max: 5, lockedUntil: null }));
app.post('/api/managebot/logout', async (req, res) => res.json({ success: true }));
app.post('/api/managebot/update', async (req, res) => res.json({ success: true, settings: { mode: 'public', features: {} } }));
app.post('/api/pair', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter valid number' });
  if (pending.has(phone)) {
    try { const r = await pending.get(phone); return res.json({ success: true, pairingCode: r.code, kingCode: r.kingCode, kingMdCode: r.kingCode, displayCode: r.kingCode, state: stateFor(phone) }); } catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  }
  const task = (async () => {
    const cur = sessions.get(phone);
    if (cur?.pairing && cur.code) { if (!cur.kingCode) cur.kingCode = makeKingCode(); return { code: cur.code, kingCode: cur.kingCode }; }
    if (cur?.sock) { try { cur.sock.end(undefined); } catch (_) {} sessions.delete(phone); }
    const result = await startSocket(phone, { requestCode: true });
    if (!result.code) throw new Error('No pairing code');
    return { code: result.code, kingCode: result.kingCode };
  })();
  pending.set(phone, task);
  try { const r = await task; return res.json({ success: true, pairingCode: r.code, kingCode: r.kingCode, kingMdCode: r.kingCode, displayCode: r.kingCode, state: stateFor(phone) }); }
  catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  finally { pending.delete(phone); }
});
app.get('/api/status', (req, res) => { const numbers = String(req.query.numbers || req.query.number || '').split(',').map(phoneDigits).filter(n => /^\d{8,15}$/.test(n)); const bots = {}; numbers.forEach(n => { const s = sessions.get(n); bots[n] = { state: stateFor(n), connected: Boolean(s?.connected), kingCode: s?.kingCode || null }; }); res.json({ success: true, bots }); });
app.delete('/api/session/:phone', bridgeAuth, async (req, res) => { const phone = phoneDigits(req.params.phone); const cur = sessions.get(phone); if (cur?.sock) { try { await cur.sock.logout(); } catch (_) { try { cur.sock.end(undefined); } catch (_) {} } } sessions.delete(phone); deleteManagePassword(phone); await fs.promises.rm(sessionPath(phone), { recursive: true, force: true }); res.json({ success: true, state: 'offline' }); });
app.post('/api/channel-react', bridgeAuth, async (req, res) => {
  const { link, emoji, amount, phoneNumbers } = req.body || {};
  if (!link) return res.status(400).json({ success: false, error: 'Missing channel link' });
  let sock = null; let usedPhone = null;
  const candidates = (Array.isArray(phoneNumbers) ? phoneNumbers : []).map(phoneDigits).filter(Boolean);
  for (const ph of candidates) { const e = sessions.get(ph); if (e?.connected && e.sock) { sock = e.sock; usedPhone = ph; break; } }
  if (!sock) { for (const e of sessions.values()) { if (e.connected && e.sock) { sock = e.sock; usedPhone = e.phone; break; } } }
  if (!sock) return res.status(409).json({ success: false, error: 'No bot online. Pair your bot first.' });
  try {
    const resolved = await resolveChannelJid(sock, link);
    if (!resolved) return res.status(400).json({ success: false, error: 'Channel not found.' });
    let channelJid = typeof resolved === 'string' ? resolved : null;
    if (!channelJid && resolved.invite) { try { const meta = await sock.newsletterMetadata('invite', resolved.invite); channelJid = meta?.id; if (channelJid) { try { await sock.newsletterFollow(channelJid); } catch (_) {} } } catch (e) {} }
    if (!channelJid) return res.status(400).json({ success: false, error: 'Could not find channel. Make bot follow it first.' });
    try { await sock.newsletterFollow(channelJid); } catch (_) {}
    try { await sock.newsletterFetch(channelJid); } catch (_) {}
    const EMOJIS = ['❤️','🔥','👍','😂','😮','😢','🙏'];
    const total = Math.max(1, Math.min(Number(amount) || 1, 10));
    let sent = 0; let lastErr = '';
    for (let i = 0; i < total; i++) {
      const e = emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      try { if (typeof sock.newsletterReact === 'function') await sock.newsletterReact(channelJid, e); else if (typeof sock.newsletterReactMessage === 'function') await sock.newsletterReactMessage(channelJid, e); else throw new Error('newsletterReact not available'); sent++; } catch (err) { lastErr = err.message || String(err); }
      if (i < total - 1) await new Promise(r => setTimeout(r, 900));
    }
    if (!sent) return res.status(500).json({ success: false, error: 'Engine failed: ' + lastErr });
    return res.json({ success: true, reactionsSent: sent, sent, usedPhone, channelJid });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});
app.use((req, res) => res.status(404).json({ success: false, error: 'Not found: ' + req.path }));
app.use((err, req, res, next) => { console.log('[KING MD] Express error:', err.message); res.status(500).json({ success: false, error: err.message }); });
async function restoreSessions() {
  const dirs = await fs.promises.readdir(SESSION_DIR, { withFileTypes: true }).catch(() => []);
  for (const item of dirs) { if (!item.isDirectory()) continue; try { const meta = JSON.parse(await fs.promises.readFile(path.join(SESSION_DIR, item.name, 'phone.json'), 'utf8')); const creds = JSON.parse(await fs.promises.readFile(path.join(SESSION_DIR, item.name, 'creds.json'), 'utf8')); if (phoneDigits(meta.phone) && creds.registered) await startSocket(phoneDigits(meta.phone), { requestCode: false }); } catch (_) {} }
}
setInterval(() => { console.log('[KING MD] Still awake 👑 Uptime:', Math.floor(process.uptime()), 's'); }, 30000);
setInterval(async () => { const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL; if (!selfUrl) return; try { const r = await fetch(selfUrl + '/health'); console.log('[KING MD] Self-ping:', r.status); } catch (e) {} }, 4 * 60 * 1000);
process.on('uncaughtException', e => console.log('[KING MD] Uncaught:', e.message));
process.on('unhandledRejection', e => console.log('[KING MD] Rejection:', e?.message));
app.listen(PORT, '0.0.0.0', () => { console.log('[KING MD] Listening on ' + PORT + ' | Website: ' + WEBSITE); restoreSessions().catch(e => console.log('[KING MD] Restore failed:', e.message)); });
module.exports = { sessions, commandModules, handleMessages: runCommand, settings, config, makeKingCode, makeManagePassword, getManagePassword };
