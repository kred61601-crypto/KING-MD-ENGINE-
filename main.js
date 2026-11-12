'use strict';
// KING MD - main.js - FULL FIXED ✅
// FIXED: Added PRIVATE WELCOME + Manage Password + assets/logo.jpg
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

console.log('[KING MD] Libs loaded - settings:', !!settings, 'config:', !!config);

// ===== 1B. MANAGE-BOT PASSWORD - NEW ✅ =====
// Bot creates password, App checks SAME file - so App MUST accept bot password
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

// ===== 2B. PRIVATE WELCOME - NEW ✅ =====
async function sendPrivateWelcome(sock, phone) {
  try {
    // If already has password and still online, don't make new one on reconnect
    let saved = getManagePassword(phone);
    let password = saved?.password;
    if (!password) {
      password = makeManagePassword();
      saveManagePassword(phone, password);
    }
    console.log(`[KING MD] Manage password for ${phone}: ${password}`);

    const welcome = `╭──────────────────❍
│ 👋 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎
│ 👑🔥𝐊𝐈𝐍𝐆-𝐌𝐃-𝐕4🔥👑
╰──────────────────❍

*🤖 Your bot has been connected successfully and is now online ✅.*

• \`Type .menu to view all commands\`
• \`Type .settings to check current settings\`

*📱 Bot Number*
└➤ +${phone}

*🔐 Manage-Bot Password*
└➤ \`${password}\`

*🌐 Bot Control Panel*
└➤ ${WEBSITE || 'https://your-kingmd-panel/settings'}
━━━━━━━━━━━━━━━━

*📍 How to Manage Your Bot*
• Open the website
• Tap ☰ Menu
• Select Manage Bot
• Enter your password
━━━━━━━━━━━━━━━━

*💡 ꜰᴏʀɢᴏᴛ ʏᴏᴜʀ ᴘᴀssᴡᴏʀᴅ?*
sɪᴍᴘʟʏ ᴛʏᴘᴇ *.ᴘᴀssᴡᴏʀᴅ* ᴀɴᴅ ʏᴏᴜʀ ᴘᴀssᴡᴏʀᴅ ᴡɪʟʟ ʙᴇ ᴅᴇʟɪᴠᴇʀᴇᴅ ᴘʀɪᴠᴀᴛᴇʟʏ.

━━━━━━━━━━━━━━━━
*⚠️ 𝐒ᴇᴄᴜʀɪᴛʏ 𝐍ᴏᴛɪᴄᴇ*
ᴋᴇᴇᴘ ʏᴏᴜʀ ᴘᴀssᴡᴏʀᴅ ᴘʀɪᴠᴀᴛᴇ. ꜰᴏʀ ʏᴏᴜʀ sᴀꜰᴇᴛʏ, ɪᴛ ᴡɪʟʟ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ᴇxᴘɪʀᴇ ᴡʜᴇɴ ᴛʜɪs ʙᴏᴛ ʟᴏɢs ᴏᴜᴛ.
━━━━━━━━━━━━━━━━`;

    // Use assets/logo.jpg - if not found, send text only
    const logoPath = path.join(__dirname, 'assets', 'logo.jpg');
    if (fs.existsSync(logoPath)) {
      await sock.sendMessage(sock.user.id, { image: fs.readFileSync(logoPath), caption: welcome });
    } else {
      // Try png too
      const logoPng = path.join(__dirname, 'assets', 'logo.png');
      if (fs.existsSync(logoPng)) {
        await sock.sendMessage(sock.user.id, { image: fs.readFileSync(logoPng), caption: welcome });
      } else {
        await sock.sendMessage(sock.user.id, { text: welcome });
      }
    }
    console.log('[KING MD] ✅ Private welcome sent to', phone);
  } catch (e) {
    console.log('[KING MD] Welcome failed:', e.message);
  }
}

// ===== 3. COMMANDS (AUTO-DISCOVERY) =====
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

  // ===== .password COMMAND - NEW ✅ - ONLY OWNER, ONLY PRIVATE =====
  if (requestedName === 'password') {
    const from = message.key.remoteJid;
    const isPrivate = !from.endsWith('@g.us') && !from.endsWith('@newsletter');
    // Owner = the bot number itself sending to itself, or message from bot owner
    // We check: if chat is private and sender is owner (bot's own number)
    // For safety, only reply if this is a private chat
    if (!isPrivate) {
      await sock.sendMessage(from, { text: `❌ *KING MD*\nFor safety, type *.password* in private chat with your bot, not in group.` }, { quoted: message }).catch(()=>{});
      return;
    }
    // In Baileys, owner's messages come as fromMe=false but remoteJid = owner number when owner messages bot
    // Get phone from remoteJid
    const ownerPhone = from.split('@')[0].split(':')[0];
    const saved = getManagePassword(ownerPhone) || getManagePassword(sock.user.id.split(':')[0]);
    if (saved) {
      await sock.sendMessage(from, { text: `*🔐 Your Manage-Bot Password*\n└➤ \`${saved.password}\`\n\n*📱 Bot Number*\n└➤ +${saved.botNumber}\n\nUse it to login to Manage Bot.` }, { quoted: message }).catch(()=>{});
    } else {
      await sock.sendMessage(from, { text: `❌ No password found. Reconnect your bot to get a new one.` }, { quoted: message }).catch(()=>{});
    }
    return;
  }

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
    if (cmdName === 'song') await handler(sock, from, message, extra);
    else await handler(sock, message, extra);
  } catch (error) {
    console.error(`[KING MD] Command .${cmdName} failed:`, error.stack || error.message || error);
    await sock.sendMessage(from, {
      text: `❌ *KING MD*\nThe .${cmdName} command failed. Please try again later.`
    }, { quoted: message }).catch(() => {});
  }
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
      try { await runCommand(sock, message); } catch (e) { console.error(e.message); }
    }
  });
  sock.ev.on('connection.update', update => {
    entry.updatedAt = Date.now();
    if (update.connection === 'open') {
        entry.connected = true; entry.pairing = false; entry.code = null; entry.kingCode = null; entry.loggedOut = false; entry.reconnectAttempts = 0;
        console.log('[KING MD] OPEN:', phone);
        autoFollowChannel(sock);
        // ===== FIXED: SEND PRIVATE WELCOME HERE ✅ =====
        sendPrivateWelcome(sock, phone);
    }
    if (update.connection === 'close') {
      entry.connected = false; entry.pairing = false;
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      entry.loggedOut = statusCode === DisconnectReason.loggedOut;
      if (statusCode === 405) return;
      // On logout, delete manage password - expires like EmmyHenz
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

// ===== HELPER: Find channel JID from any link format =====
async function resolveChannelJid(sock, link) {
  const raw = String(link || '').trim();
  let id = raw;
  if (raw.includes('/channel/')) id = raw.split('/channel/')[1].split(/[?\/\s]/)[0];
  id = id.trim();
  if (!id) return null;
  if (id.includes('@newsletter')) return id;
  try {
    const meta = await sock.newsletterMetadata('jid', id.includes('@') ? id : id + '@newsletter');
    if (meta?.id) return meta.id;
  } catch (_) {}
  try {
    const meta2 = await sock.newsletterMetadata('invite', id);
    if (meta2?.id) return meta2.id;
  } catch (_) {}
  return { invite: id };
}

// ===== WEB ROUTES =====
app.get('/', (_req, res) => res.send(`<h1>👑 KING MD V4 ONLINE</h1><p>Website: ${WEBSITE}</p><p>Status: <a href="/health">/health</a></p><p>Bots: ${sessions.size}</p>`));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'KING MD', website: WEBSITE, activeSessions: sessions.size, uptime: Math.floor(process.uptime()) }));
app.get('/api/pair', (_req, res) => res.json({ success: false, error: 'Use POST /api/pair' }));

// ===== MANAGE-BOT LOGIN - FOR APP ✅ =====
// App calls this to check if bot number + password is correct
// MUST accept bot's password because both use manage-passwords.json
app.post('/api/manage-login', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber || req.body?.botNumber);
  const password = String(req.body?.password || '').trim();
  if (!phone || !password) return res.status(400).json({ success: false, error: 'Enter bot number and password' });
  const saved = getManagePassword(phone);
  if (saved && saved.password === password) {
    return res.json({ success: true, botNumber: phone, message: 'Welcome to Manage Bot' });
  }
  return res.status(401).json({ success: false, error: 'Wrong bot number or password' });
});

// For App to request password resend via WhatsApp
app.post('/api/forgot-password', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber || req.body?.botNumber);
  const entry = sessions.get(phone);
  const saved = getManagePassword(phone);
  if (!saved) return res.status(404).json({ success: false, error: 'No password found for this number. Connect bot first.' });
  if (entry?.sock && entry.connected) {
    await sendPrivateWelcome(entry.sock, phone);
    return res.json({ success: true, message: 'Password sent to your WhatsApp privately. Check your bot chat.' });
  }
  return res.json({ success: true, message: 'Bot is offline, but password exists. Pair bot again to receive it.' });
});

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

app.delete('/api/session/:phone', bridgeAuth, async (req, res) => { const phone = phoneDigits(req.params.phone); const cur = sessions.get(phone); if (cur?.sock) { try { await cur.sock.logout(); } catch (_) { try { cur.sock.end(undefined); } catch (_) {} } } sessions.delete(phone); deleteManagePassword(phone); await fs.promises.rm(sessionPath(phone), { recursive: true, force: true }); res.json({ success: true, state: 'offline' }); });

// ===== ✅ CHANNEL REACT - THIS WAS MISSING! MUST BE BEFORE 404! =====
app.post('/api/channel-react', bridgeAuth, async (req, res) => {
  const { link, emoji, amount, phoneNumbers } = req.body || {};
  if (!link) return res.status(400).json({ success: false, error: 'Missing channel link' });
  console.log('[KING MD] Channel-React request:', link, 'phones:', phoneNumbers, 'amount:', amount);
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
    const resolved = await resolveChannelJid(sock, link);
    if (!resolved) return res.status(400).json({ success: false, error: 'Channel not found. Check link.' });
    let channelJid = typeof resolved === 'string' ? resolved : null;
    if (!channelJid && resolved.invite) {
      try {
        const meta = await sock.newsletterMetadata('invite', resolved.invite);
        channelJid = meta?.id;
        if (channelJid) { try { await sock.newsletterFollow(channelJid); } catch (_) {} }
      } catch (e) { console.log('[KING MD] Invite resolve fail:', e.message); }
    }
    if (!channelJid) return res.status(400).json({ success: false, error: 'Could not find channel. Make sure bot follows it. Open WhatsApp on bot number > Channels > Follow this channel, then try again.' });
    try { await sock.newsletterFollow(channelJid); } catch (_) {}
    try { await sock.newsletterFetch(channelJid); } catch (_) {}
    const EMOJIS = ['❤️','🔥','👍','😂','😮','😢','🙏'];
    const total = Math.max(1, Math.min(Number(amount) || 1, 10));
    let sent = 0;
    let lastErr = '';
    for (let i = 0; i < total; i++) {
      const e = emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      try {
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

module.exports = { sessions, commandModules, handleMessages: runCommand, settings, config, makeKingCode, makeManagePassword, getManagePassword };
