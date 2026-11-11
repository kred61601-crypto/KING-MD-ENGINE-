'use strict';

// KING MD pairing gateway - FIXED for V4 App CHECKING bug
// Fix: /api/status is now public so App can show ONLINE/OFFLINE
// Fix: bridgeAuth accepts x-pair-bridge-key, x-api-key, Authorization
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pino = require('pino');
const baileys = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate } = require('./main');

const makeWASocket = baileys.default || baileys.makeWASocket;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const DisconnectReason = baileys.DisconnectReason || { loggedOut: 401 };
const Browsers = baileys.Browsers;

const WA_WEB_VERSION = String(process.env.WA_WEB_VERSION || '2.3000.1053060988')
  .split('.')
  .map(part => Number(part));
if (WA_WEB_VERSION.length !== 3 || WA_WEB_VERSION.some(n => !Number.isInteger(n) || n < 0)) {
  throw new Error('WA_WEB_VERSION must look like 2.3000.1053060988');
}

if (typeof makeWASocket !== 'function' || typeof useMultiFileAuthState !== 'function') {
  throw new Error('Baileys does not expose makeWASocket/useMultiFileAuthState. Check the Baileys dependency version.');
}

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));
const PORT = Number(process.env.PORT || 10000);
const SESSION_DIR = process.env.PAIR_SESSION_DIR || path.join(__dirname, 'pair_sessions');
// Must match the private server-to-server key in the KING MD V1 app server.
// V4 App may send it as x-api-key or Authorization, we accept all below.
const BRIDGE_KEY = process.env.PAIR_BRIDGE_KEY || 'uFOg2BeCn3EJV6tf1fdXbsMSwshScKuzFDQwvoh68jx59ftO';
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
fs.mkdirSync(SESSION_DIR, { recursive: true });

const sessions = new Map();
const pending = new Map();
const phoneDigits = value => String(value || '').replace(/\D/g, '');
const sessionPath = phone => path.join(SESSION_DIR, crypto.createHash('sha256').update(phone).digest('hex'));
const stateFor = phone => {
  const s = sessions.get(phone);
  if (!s) {
    // If creds file exists on disk but not in memory yet (restart), don't lie "offline"
    try {
      const creds = JSON.parse(fs.readFileSync(path.join(sessionPath(phone), 'creds.json'), 'utf8'));
      if (creds && creds.registered) return 'connecting';
    } catch (_) {}
    return 'offline';
  }
  if (s.connected) return 'online';
  if (s.pairing) return 'pairing';
  return s.loggedOut ? 'offline' : 'connecting';
};

function getBridgeKeyFromReq(req) {
  return req.get('x-pair-bridge-key') || req.get('x-bridge-key') || req.get('x-api-key') || String(req.get('authorization') || '').replace(/^Bearer\s+/i, '') || '';
}

function bridgeAuth(req, res, next) {
  if (!BRIDGE_KEY || getBridgeKeyFromReq(req) !== BRIDGE_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized engine request.' });
  }
  next();
}

async function startSocket(phone, opts = {}) {
  const dir = sessionPath(phone);
  fs.mkdirSync(dir, { recursive: true });
  const auth = await useMultiFileAuthState(dir);
  const sock = makeWASocket({
    auth: auth.state,
    version: WA_WEB_VERSION,
    logger,
    printQRInTerminal: false,
    browser: Browsers && Browsers.macOS ? Browsers.macOS('Chrome') : ['KING MD', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });
  const entry = { phone, sock, connected: false, pairing: false, loggedOut: false, code: null, updatedAt: Date.now(), reconnectAttempts: 0, reconnectTimer: null };
  sessions.set(phone, entry);
  sock.ev.on('creds.update', () => {
    auth.saveCreds().catch(error => console.error('[KING MD] Could not save WhatsApp credentials:', error.message));
  });
  sock.public = true;
  sock.ev.on('messages.upsert', async chatUpdate => {
    const { messages } = chatUpdate || {};
    if (!Array.isArray(messages)) return;

    // Do not gate on type === 'notify': some Baileys builds deliver live user
    // messages through other upsert types. The command handler should decide
    // whether an individual message is actionable.
    for (const message of messages) {
      if (!message || !message.key || !message.key.remoteJid || !message.message) continue;
      try {
        await handleMessages(sock, message, chatUpdate);
      } catch (error) {
        console.error('[KING MD] Original command handler failed:', error && error.stack || error);
      }
    }
  });
  sock.ev.on('group-participants.update', async update => {
    try {
      await handleGroupParticipantUpdate(sock, update);
    } catch (error) {
      console.error('[KING MD] Group participant handler failed:', error && error.stack || error);
    }
  });
  sock.ev.on('connection.update', update => {
    entry.updatedAt = Date.now();
    if (update.connection === 'connecting') {
      console.log('[KING MD] WhatsApp socket connecting:', phone);
    }
    if (update.connection === 'open') {
      entry.connected = true; entry.pairing = false; entry.code = null; entry.loggedOut = false;
      entry.reconnectAttempts = 0;
      console.log('[KING MD] WhatsApp connection OPEN:', phone);
    }
    if (update.connection === 'close') {
      entry.connected = false; entry.pairing = false;
      const disconnectError = update.lastDisconnect && update.lastDisconnect.error;
      const statusCode = disconnectError && disconnectError.output && disconnectError.output.statusCode;
      entry.loggedOut = statusCode === DisconnectReason.loggedOut;
      console.error('[KING MD] WhatsApp connection CLOSED:', phone, 'status=', statusCode || 'unknown', 'reason=', disconnectError && disconnectError.message || 'not supplied');
      if (statusCode === 405) {
        entry.loggedOut = false;
        console.error('[KING MD] HTTP 405: WhatsApp rejected the Web protocol version', WA_WEB_VERSION.join('.'), '. Set WA_WEB_VERSION to a currently accepted version and redeploy.');
        return;
      }
      if (!entry.loggedOut && sessions.get(phone) === entry && !entry.reconnectTimer) {
        const attempt = (entry.reconnectAttempts || 0) + 1;
        entry.reconnectAttempts = attempt;
        const delay = Math.min(15000, 1500 * attempt);
        console.warn('[KING MD] Reconnecting WhatsApp socket in', delay, 'ms; attempt', attempt);
        entry.reconnectTimer = setTimeout(async () => {
          entry.reconnectTimer = null;
          if (sessions.get(phone) !== entry) return;
          try {
            await startSocket(phone, { requestCode: false });
          } catch (error) {
            console.error('[KING MD] WhatsApp reconnect failed:', phone, error.message);
          }
        }, delay);
        if (entry.reconnectTimer.unref) entry.reconnectTimer.unref();
      }
    }
  });
  if (opts.requestCode && !auth.state.creds.registered) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const code = await sock.requestPairingCode(phone);
    entry.code = String(code || '').replace(/[^A-Za-z0-9-]/g, '');
    entry.pairing = true;
    entry.updatedAt = Date.now();
    return { entry, code: entry.code };
  }
  if (auth.state.creds.registered) entry.connected = false;
  return { entry, code: null };
}

const originalStartSocket = startSocket;
const startSocketWithIndex = async function(phone, opts) {
  const result = await originalStartSocket(phone, opts);
  try { await fs.promises.writeFile(path.join(sessionPath(phone), 'phone.json'), JSON.stringify({ phone }), { mode: 0o600 }); } catch (_) {}
  return result;
};
// Use wrapper for all future calls
const startSocketFinal = startSocketWithIndex;

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'KING MD WhatsApp Pairing Engine', activeSessions: sessions.size }));
app.get('/api/health', (_req, res) => res.json({ success: true, service: 'KING MD WhatsApp Pairing Engine' }));
app.get('/sessions', (_req, res) => res.json({ success: true, total: sessions.size, serverStats: { detectedServers: 1, serversLeft: 0 }, bots: [...sessions.values()].map(s => ({ number: s.phone, state: stateFor(s.phone), connected: s.connected })) }));

app.post('/api/pair', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.body && req.body.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter a valid WhatsApp number with country code.' });
  if (pending.has(phone)) {
    try {
      const result = await pending.get(phone);
      return res.json({ success: true, pairingCode: result.code, state: stateFor(phone) });
    } catch (e) { return res.status(502).json({ success: false, error: e.message || 'Could not create pairing code.' }); }
  }
  const existing = sessions.get(phone);
  if (existing && existing.connected) return res.status(409).json({ success: false, code: 'ALREADY_CONNECTED', error: 'This WhatsApp number is already connected.' });
  const task = (async () => {
    const current = sessions.get(phone);
    if (current && current.pairing && current.code) return { code: current.code };
    if (current && current.sock) { try { current.sock.end(undefined); } catch (_) {} sessions.delete(phone); }
    const result = await startSocketFinal(phone, { requestCode: true });
    if (!result.code) throw new Error('WhatsApp did not return a pairing code. Please retry.');
    return { code: result.code };
  })();
  pending.set(phone, task);
  try {
    const result = await task;
    return res.json({ success: true, pairingCode: result.code, state: stateFor(phone) });
  } catch (error) {
    console.error('[KING MD] Pairing failed:', error.message);
    const current = sessions.get(phone);
    if (current && !current.connected) { try { current.sock.end(undefined); } catch (_) {} sessions.delete(phone); }
    return res.status(502).json({ success: false, error: 'Could not obtain a WhatsApp pairing code: ' + (error.message || 'engine error') });
  } finally { pending.delete(phone); }
});

// FIXED: No bridgeAuth here - V4 App needs to poll this without key to stop CHECKING
app.get('/api/status', (req, res) => {
  const numbers = String(req.query.numbers || req.query.number || '').split(',').map(phoneDigits).filter(n => /^\d{8,15}$/.test(n)).slice(0, 30);
  const bots = {};
  numbers.forEach(n => {
    const session = sessions.get(n);
    bots[n] = { state: stateFor(n), connected: Boolean(session && session.connected), updatedAt: session ? session.updatedAt : null };
  });
  res.json({ success: true, bots });
});

app.delete('/api/session/:phone', bridgeAuth, async (req, res) => {
  const phone = phoneDigits(req.params.phone);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Invalid phone number.' });
  const current = sessions.get(phone);
  if (current && current.reconnectTimer) clearTimeout(current.reconnectTimer);
  if (current && current.sock) { try { await current.sock.logout(); } catch (_) { try { current.sock.end(undefined); } catch (_) {} } }
  sessions.delete(phone);
  await fs.promises.rm(sessionPath(phone), { recursive: true, force: true });
  res.json({ success: true, state: 'offline' });
});

app.post('/api/channel-react', bridgeAuth, async (req, res) => {
  const body = req.body || {};
  const match = String(body.link || '').match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)\/(\d+)/i);
  if (!match) return res.status(400).json({ success: false, error: 'Use a WhatsApp channel post link ending in its post ID.' });
  const requested = (Array.isArray(body.phoneNumbers) ? body.phoneNumbers : []).map(phoneDigits).filter(n => sessions.has(n) && sessions.get(n).connected).slice(0, 20);
  if (!requested.length) return res.status(409).json({ success: false, error: 'No connected bot is available. Link a WhatsApp bot first.' });
  const emojis = body.random || !body.emoji ? ['❤️', '🔥', '👍', '😍', '💯'] : String(body.emoji).split(',').map(x => x.trim()).filter(Boolean).slice(0, 5);
  if (!emojis.length) return res.status(400).json({ success: false, error: 'Choose at least one reaction emoji.' });
  const amount = Math.max(1, Math.min(Number(body.amount) || 1, requested.length));
  const outcomes = [];
  for (let i = 0; i < amount; i++) {
    const phone = requested[i];
    const sock = sessions.get(phone).sock;
    if (typeof sock.newsletterReactMessage !== 'function') {
      outcomes.push({ phone, success: false, error: 'This Baileys build does not support channel reactions.' });
      continue;
    }
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    try {
      await sock.newsletterReactMessage(match[1] + '@newsletter', match[2], emoji);
      outcomes.push({ phone, success: true, emoji });
    } catch (error) { outcomes.push({ phone, success: false, error: error.message || 'Reaction failed' }); }
  }
  const sent = outcomes.filter(x => x.success);
  res.json({ success: sent.length > 0, reactionsSent: sent.length, emojisUsed: [...new Set(sent.map(x => x.emoji))], results: outcomes, error: sent.length ? undefined : (outcomes[0] && outcomes[0].error) || 'No reactions were sent.' });
});

async function restoreSessions() {
  const dirs = await fs.promises.readdir(SESSION_DIR, { withFileTypes: true }).catch(() => []);
  for (const item of dirs) {
    if (!item.isDirectory()) continue;
    const dir = path.join(SESSION_DIR, item.name);
    const metaPath = path.join(dir, 'phone.json');
    const credsPath = path.join(dir, 'creds.json');
    try {
      const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
      const creds = JSON.parse(await fs.promises.readFile(credsPath, 'utf8'));
      const phone = phoneDigits(meta.phone);
      if (phone && creds.registered) await startSocketFinal(phone, { requestCode: false });
    } catch (_) {}
  }
}

restoreSessions().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log('[KING MD] Pairing engine listening on ' + PORT));
}).catch(error => {
  console.error('[KING MD] Session restore warning:', error.message);
  app.listen(PORT, '0.0.0.0', () => console.log('[KING MD] Pairing engine listening on ' + PORT));
});
