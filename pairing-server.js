/**
 * KING MD WhatsApp pairing bridge.
 * Runs inside the engine service and owns Baileys auth/session state.
 */
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const PORT = Number(process.env.PORT || 10000);
const PAIR_BRIDGE_KEY = process.env.PAIR_BRIDGE_KEY || '';
const SESSION_ROOT = path.resolve(process.env.PAIR_SESSION_DIR || path.join(__dirname, 'pair_sessions'));
const sessions = new Map();
const pending = new Map();
const lastRequest = new Map();
fs.mkdirSync(SESSION_ROOT, { recursive: true });

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function cleanNumber(value) {
  return String(value || '').replace(/\D/g, '');
}
function auth(req, res, next) {
  if (!PAIR_BRIDGE_KEY || !safeEqual(req.get('x-pair-bridge-key'), PAIR_BRIDGE_KEY)) {
    return res.status(401).json({ success: false, error: 'Pairing bridge authentication failed.' });
  }
  next();
}
function statusOf(number) {
  const item = sessions.get(number);
  if (!item) return 'offline';
  return item.connected ? 'online' : item.pairing ? 'pairing' : 'offline';
}
async function connectNumber(number, requestCode) {
  const dir = path.join(SESSION_ROOT, number);
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  if (state.creds.registered && requestCode) {
    throw new Error('This number already has a saved WhatsApp session. Remove its old session before pairing again.');
  }
  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
  } catch (_) {}
  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ['KING MD', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000
  });
  const item = { sock, connected: false, pairing: !!requestCode, createdAt: Date.now() };
  sessions.set(number, item);
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', update => {
    if (update.connection === 'open') {
      item.connected = true;
      item.pairing = false;
      pending.delete(number);
    }
    if (update.connection === 'close') {
      item.connected = false;
      const code = update.lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        sessions.delete(number);
      } else {
        item.pairing = false;
        // Reconnect with the saved multi-file auth state after transient disconnects.
        setTimeout(async () => {
          if (sessions.get(number) !== item) return;
          try { await connectNumber(number, false); }
          catch (error) { console.error('[KING MD] Reconnect failed:', number, error.message); }
        }, 3000).unref();
      }
    }
  });
  return { sock, state, item };
}
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'KING MD WhatsApp pairing engine',
  configured: !!PAIR_BRIDGE_KEY,
  activeSessions: sessions.size
}));
app.post('/api/pair', auth, async (req, res) => {
  const phoneNumber = cleanNumber(req.body?.phoneNumber);
  if (!/^\d{8,15}$/.test(phoneNumber)) {
    return res.status(400).json({ success: false, error: 'Enter a valid phone number including country code.' });
  }
  const now = Date.now();
  if (now - (lastRequest.get(phoneNumber) || 0) < 60000) {
    return res.status(429).json({ success: false, error: 'Please wait one minute before requesting another code for this number.' });
  }
  lastRequest.set(phoneNumber, now);
  try {
    const existing = sessions.get(phoneNumber);
    if (existing?.connected) {
      return res.status(409).json({ success: false, error: 'This number is already connected to the KING MD engine.' });
    }
    if (existing?.sock) {
      try { existing.sock.end(undefined); } catch (_) {}
      sessions.delete(phoneNumber);
    }
    const { sock } = await connectNumber(phoneNumber, true);
    const code = await Promise.race([
      sock.requestPairingCode(phoneNumber),
      new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp pairing code request timed out. Try again.')), 55000))
    ]);
    const pairingCode = String(code || '').replace(/[^A-Z0-9-]/gi, '').toUpperCase();
    if (!pairingCode) throw new Error('WhatsApp did not return a pairing code. Please try again.');
    pending.set(phoneNumber, Date.now() + 5 * 60 * 1000);
    return res.json({ success: true, pairingCode, serverInfo: { serverUsed: 'KING MD Engine' } });
  } catch (error) {
    const item = sessions.get(phoneNumber);
    if (item?.sock) { try { item.sock.end(undefined); } catch (_) {} }
    sessions.delete(phoneNumber);
    console.error('[PAIR]', phoneNumber, error.message);
    return res.status(502).json({ success: false, error: error.message || 'Could not create a WhatsApp pairing code.' });
  }
});
app.post('/api/bots/status', auth, (req, res) => {
  const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : [];
  const bots = {};
  numbers.slice(0, 30).forEach(value => {
    const number = cleanNumber(value);
    if (/^\d{8,15}$/.test(number)) bots[number] = statusOf(number);
  });
  res.json({ success: true, bots });
});
app.get('/api/bots/status/:number', auth, (req, res) => {
  const number = cleanNumber(req.params.number);
  res.json({ success: true, number, state: statusOf(number) });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[KING MD] Pairing API listening on ${PORT}`);
  if (!PAIR_BRIDGE_KEY) console.error('[KING MD] PAIR_BRIDGE_KEY is missing; pairing requests are disabled.');
});

// Restore saved sessions after a service restart so linked devices stay connected.
(async () => {
  for (const name of fs.readdirSync(SESSION_ROOT)) {
    if (!/^\d{8,15}$/.test(name)) continue;
    try {
      const dir = path.join(SESSION_ROOT, name);
      if (!fs.existsSync(path.join(dir, 'creds.json'))) continue;
      const { sock } = await connectNumber(name, false);
      console.log(`[KING MD] Restoring WhatsApp session for +${name}`);
    } catch (error) {
      console.error('[KING MD] Session restore failed:', name, error.message);
    }
  }
})();
