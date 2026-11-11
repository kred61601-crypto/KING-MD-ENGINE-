'use strict';
// KING MD - main.js - FULL FIXED - START WITH LIBS, THEN COMMANDS 👑

// ===== 1. START WITH LIBS / SETTINGS - LIKE ORIGINAL =====
function safeRequire(p) { try { return require(p); } catch (e) { console.log('[KING MD] Skip lib', p, '-', e.message); return null; } }

const settings = safeRequire('./settings');
const config = safeRequire('./config.js');
const isBanned = safeRequire('./lib/isBanned');
const ytSearch = safeRequire('yt-search');
const myfunc = safeRequire('./lib/myfunc');
const fs = safeRequire('fs');
const fetch = safeRequire('node-fetch');
const ytdl = safeRequire('ytdl-core');
const path = safeRequire('path');
const axios = safeRequire('axios');
const ffmpeg = safeRequire('fluent-ffmpeg');
const libIndex = safeRequire('./lib/index');
const isAdmin = safeRequire('./lib/isAdmin');
const antilinkLib = safeRequire('./lib/antilink');
const antibadwordLib = safeRequire('./lib/antibadword');
const reactionsLib = safeRequire('./lib/reactions');

console.log('[KING MD] Libs loaded - settings:', !!settings, 'config:', !!config);

// ===== 2. PAIRING ENGINE SETUP =====
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
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
const CHANNEL = 'https://whatsapp.com/channel/0029Vb9AwScF6sn47ClubG1Z';
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
fs.mkdirSync(SESSION_DIR, { recursive: true });

// ===== 3. THEN GO DOWN TO ALL COMMANDS - VISIBLE =====
const commandModules = new Map();
function addCmd(name, mod) { if (mod) commandModules.set(name, mod); }

addCmd('tagall', safeRequire('./commands/tagall'));
addCmd('help', safeRequire('./commands/help'));
addCmd('ban', safeRequire('./commands/ban'));
addCmd('promote', safeRequire('./commands/promote'));
addCmd('anticall', safeRequire('./commands/anticall'));
addCmd('kickall', safeRequire('./commands/kickall'));
addCmd('autorecording', safeRequire('./commands/autorecording'));
addCmd('pair', safeRequire('./commands/pair'));
addCmd('demote', safeRequire('./commands/demote'));
addCmd('mute', safeRequire('./commands/mute'));
addCmd('unmute', safeRequire('./commands/unmute'));
addCmd('sticker', safeRequire('./commands/sticker'));
addCmd('save', safeRequire('./commands/save'));
addCmd('warn', safeRequire('./commands/warn'));
addCmd('warnings', safeRequire('./commands/warnings'));
addCmd('tts', safeRequire('./commands/tts'));
addCmd('tictactoe', safeRequire('./commands/tictactoe'));
addCmd('setbotbio', safeRequire('./commands/setbotbio'));
addCmd('topmembers', safeRequire('./commands/topmembers'));
addCmd('owner', safeRequire('./commands/owner'));
addCmd('delete', safeRequire('./commands/delete'));
addCmd('antilink', safeRequire('./commands/antilink'));
addCmd('meme', safeRequire('./commands/meme'));
addCmd('tag', safeRequire('./commands/tag'));
addCmd('joke', safeRequire('./commands/joke'));
addCmd('quote', safeRequire('./commands/quote'));
addCmd('fact', safeRequire('./commands/fact'));
addCmd('weather', safeRequire('./commands/weather'));
addCmd('news', safeRequire('./commands/news'));
addCmd('kick', safeRequire('./commands/kick'));
addCmd('simage', safeRequire('./commands/simage'));
addCmd('attp', safeRequire('./commands/attp'));
addCmd('hangman', safeRequire('./commands/hangman'));
addCmd('trivia', safeRequire('./commands/trivia'));
addCmd('compliment', safeRequire('./commands/compliment'));
addCmd('insult', safeRequire('./commands/insult'));
addCmd('eightball', safeRequire('./commands/eightball'));
addCmd('lyrics', safeRequire('./commands/lyrics'));
addCmd('dare', safeRequire('./commands/dare'));
addCmd('truth', safeRequire('./commands/truth'));
addCmd('clear', safeRequire('./commands/clear'));
addCmd('ping', safeRequire('./commands/ping'));
addCmd('alive', safeRequire('./commands/alive'));
addCmd('img-blur', safeRequire('./commands/img-blur'));
addCmd('welcome', safeRequire('./commands/welcome'));
addCmd('goodbye', safeRequire('./commands/goodbye'));
addCmd('github', safeRequire('./commands/github'));
addCmd('antibadword', safeRequire('./commands/antibadword'));
addCmd('groupmanage', safeRequire('./commands/groupmanage'));
addCmd('multiplugin', safeRequire('./commands/multiplugin'));
addCmd('pmpermit', safeRequire('./commands/pmpermit'));
addCmd('chatbot', safeRequire('./commands/chatbot'));
addCmd('savecontact', safeRequire('./commands/savecontact'));
addCmd('creategc', safeRequire('./commands/creategc'));
addCmd('take', safeRequire('./commands/take'));
addCmd('flirt', safeRequire('./commands/flirt'));
addCmd('character', safeRequire('./commands/character'));
addCmd('wasted', safeRequire('./commands/wasted'));
addCmd('ship', safeRequire('./commands/ship'));
addCmd('groupinfo', safeRequire('./commands/groupinfo'));
addCmd('resetlink', safeRequire('./commands/resetlink'));
addCmd('staff', safeRequire('./commands/staff'));
addCmd('unban', safeRequire('./commands/unban'));
addCmd('emojimix', safeRequire('./commands/emojimix'));
addCmd('viewonce', safeRequire('./commands/viewonce'));
addCmd('clearsession', safeRequire('./commands/clearsession'));
addCmd('autostatus', safeRequire('./commands/autostatus'));
addCmd('simp', safeRequire('./commands/simp'));
addCmd('block', safeRequire('./commands/block'));
addCmd('stupid', safeRequire('./commands/stupid'));
addCmd('stickertelegram', safeRequire('./commands/stickertelegram'));
addCmd('textmaker', safeRequire('./commands/textmaker'));
addCmd('antidelete', safeRequire('./commands/antidelete'));
addCmd('cleartmp', safeRequire('./commands/cleartmp'));
addCmd('setpp', safeRequire('./commands/setpp'));
addCmd('instagram', safeRequire('./commands/instagram'));
addCmd('facebook', safeRequire('./commands/facebook'));
addCmd('play', safeRequire('./commands/play'));
addCmd('tiktok', safeRequire('./commands/tiktok'));
addCmd('send', safeRequire('./commands/send'));
addCmd('song', safeRequire('./commands/song'));
addCmd('ai', safeRequire('./commands/ai'));
addCmd('translate', safeRequire('./commands/translate'));
addCmd('ss', safeRequire('./commands/ss'));
addCmd('goodnight', safeRequire('./commands/goodnight'));
addCmd('shayari', safeRequire('./commands/shayari'));
addCmd('roseday', safeRequire('./commands/roseday'));
addCmd('imagine', safeRequire('./commands/imagine'));
addCmd('video', safeRequire('./commands/video'));
addCmd('autotyping', safeRequire('./commands/autotyping'));
addCmd('online', safeRequire('./commands/online'));
addCmd('channelreact', safeRequire('./commands/channelreact'));

console.log('[KING MD] Commands loaded:', [...commandModules.keys()].join(', '));

function resolveCommandHandler(mod) {
  if (typeof mod === 'function') return mod;
  if (!mod || typeof mod !== 'object') return null;
  for (const key of ['execute', 'handler', 'run', 'command', 'default']) {
    if (typeof mod[key] === 'function') return mod[key];
  }
  return null;
}

async function runCommand(sock, message) {
  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || message.message?.videoMessage?.caption || "";
  if (!text || message.key.fromMe) return;
  const from = message.key.remoteJid;
  const parts = text.trim().split(/\s+/);
  const cmdName = parts[0].toLowerCase().replace(/^[.!]/, '');
  const args = parts.slice(1);
  if (!cmdName) return;
  if (cmdName === 'ping') { await sock.sendMessage(from, { text: '*KING MD* Pong! 👑' }); return; }
  if (cmdName === 'alive' || cmdName === 'menu') {
    await sock.sendMessage(from, { text: `*KING MD BOT* 👑\n\n.ping - Check bot\n.menu - Menu\n\nChannel: ${CHANNEL}` });
    return;
  }
  const handler = resolveCommandHandler(commandModules.get(cmdName));
  if (!handler) { console.log('[KING MD] No handler for:', cmdName); return; }
  console.log('[KING MD] Running:', cmdName);
  try { await handler(sock, message, { text, args, from, channel: CHANNEL, settings, config, ytSearch, axios, ytdl, ffmpeg, fetch }); }
  catch (e1) {
    try { await handler(sock, message); }
    catch (e2) { await sock.sendMessage(from, { text: 'Error in .' + cmdName + ' ❌' }); }
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
  const auth = await useMultiFileAuthState(dir);
  const sock = makeWASocket({ auth: auth.state, version: WA_WEB_VERSION, logger, printQRInTerminal: false, browser: Browsers && Browsers.macOS ? Browsers.macOS('Chrome') : ['KING MD', 'Chrome', '1.0.0'], syncFullHistory: false, markOnlineOnConnect: false, generateHighQualityLinkPreview: false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 25000 });
  const entry = { phone, sock, connected: false, pairing: false, loggedOut: false, code: null, updatedAt: Date.now(), reconnectAttempts: 0, reconnectTimer: null };
  sessions.set(phone, entry);
  sock.ev.on('creds.update', () => { auth.saveCreds().catch(e => console.error(e.message)); });
  sock.ev.on('messages.upsert', async chatUpdate => {
    const { messages } = chatUpdate || {};
    if (!Array.isArray(messages)) return;
    for (const message of messages) {
      console.log('[INCOMING]', message.key?.remoteJid, message.message?.conversation || message.message?.extendedTextMessage?.text || '[not-text]');
      if (!message?.key?.remoteJid || !message.message) continue;
      try { await runCommand(sock, message); } catch (e) { console.error(e.message); }
    }
  });
  sock.ev.on('connection.update', update => {
    entry.updatedAt = Date.now();
    if (update.connection === 'open') { entry.connected = true; entry.pairing = false; entry.code = null; entry.loggedOut = false; entry.reconnectAttempts = 0; console.log('[KING MD] OPEN:', phone); }
    if (update.connection === 'close') {
      entry.connected = false; entry.pairing = false;
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      entry.loggedOut = statusCode === DisconnectReason.loggedOut;
      if (statusCode === 405) return;
      if (!entry.loggedOut && sessions.get(phone) === entry && !entry.reconnectTimer) {
        const attempt = (entry.reconnectAttempts || 0) + 1; entry.reconnectAttempts = attempt;
        const delay = Math.min(15000, 1500 * attempt);
        entry.reconnectTimer = setTimeout(async () => { entry.reconnectTimer = null; if (sessions.get(phone) !== entry) return; try { await startSocket(phone, { requestCode: false }); } catch (e) { console.error(e.message); } }, delay);
        if (entry.reconnectTimer.unref) entry.reconnectTimer.unref();
      }
    }
  });
  if (opts.requestCode && !auth.state.creds.registered) {
    await new Promise(r => setTimeout(r, 3000));
    const code = await sock.requestPairingCode(phone);
    entry.code = String(code || '').replace(/[^A-Za-z0-9-]/g, ''); entry.pairing = true; entry.updatedAt = Date.now();
    return { entry, code: entry.code };
  }
  return { entry, code: null };
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'KING MD', activeSessions: sessions.size }));
app.post('/api/pair', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.body?.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter valid number' });
  if (pending.has(phone)) { try { const r = await pending.get(phone); return res.json({ success: true, pairingCode: r.code, state: stateFor(phone) }); } catch (e) { return res.status(502).json({ success: false, error: e.message }); } }
  const task = (async () => {
    const cur = sessions.get(phone);
    if (cur?.pairing && cur.code) return { code: cur.code };
    if (cur?.sock) { try { cur.sock.end(undefined); } catch (_) {} sessions.delete(phone); }
    const result = await startSocket(phone, { requestCode: true });
    if (!result.code) throw new Error('No pairing code');
    return { code: result.code };
  })();
  pending.set(phone, task);
  try { const r = await task; return res.json({ success: true, pairingCode: r.code, state: stateFor(phone) }); } catch (e) { return res.status(502).json({ success: false, error: e.message }); } finally { pending.delete(phone); }
});
app.get('/api/status', (req, res) => { const numbers = String(req.query.numbers || req.query.number || '').split(',').map(phoneDigits).filter(n => /^\d{8,15}$/.test(n)); const bots = {}; numbers.forEach(n => { const s = sessions.get(n); bots[n] = { state: stateFor(n), connected: Boolean(s?.connected) }; }); res.json({ success: true, bots }); });
app.delete('/api/session/:phone', bridgeAuth, async (req, res) => { const phone = phoneDigits(req.params.phone); const cur = sessions.get(phone); if (cur?.sock) { try { await cur.sock.logout(); } catch (_) { try { cur.sock.end(undefined); } catch (_) {} } } sessions.delete(phone); await fs.promises.rm(sessionPath(phone), { recursive: true, force: true }); res.json({ success: true, state: 'offline' }); });

async function restoreSessions() {
  const dirs = await fs.promises.readdir(SESSION_DIR, { withFileTypes: true }).catch(() => []);
  for (const item of dirs) { if (!item.isDirectory()) continue; try { const meta = JSON.parse(await fs.promises.readFile(path.join(SESSION_DIR, item.name, 'phone.json'), 'utf8')); const creds = JSON.parse(await fs.promises.readFile(path.join(SESSION_DIR, item.name, 'creds.json'), 'utf8')); if (phoneDigits(meta.phone) && creds.registered) await startSocket(phoneDigits(meta.phone), { requestCode: false }); } catch (_) {} }
}
restoreSessions().then(() => app.listen(PORT, '0.0.0.0', () => console.log('[KING MD] Listening on ' + PORT)));
module.exports = { sessions, commandModules, handleMessages: runCommand, settings, config };
