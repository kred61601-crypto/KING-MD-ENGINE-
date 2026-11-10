// KING MD dedicated WhatsApp pairing API (separate engine service)
const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { PAIR_BRIDGE_KEY, SESSION_DIR } = require('./pairing.config');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
const sockets = new Map();
const requests = new Map();
const started = new Set();
const logger = pino({ level: 'silent' });
function cleanPhone(v) { return String(v || '').replace(/\D/g, ''); }
function authorized(req) { return req.get('x-pair-bridge-key') === PAIR_BRIDGE_KEY; }
function sessionPath(phone) { return path.join(SESSION_DIR, phone); }
async function startSession(phone, requestCode) {
  const dir = sessionPath(phone);
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false, browser: ['KING MD', 'Chrome', '120.0.0'] });
  sock.ev.on('creds.update', saveCreds);
  sockets.set(phone, sock);
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      sockets.delete(phone);
      if (code !== DisconnectReason.loggedOut) setTimeout(() => startSession(phone, false).catch(() => {}), 5000);
      else { fs.rmSync(dir, { recursive: true, force: true }); started.delete(phone); }
    }
    if (connection === 'open') started.add(phone);
  });
  if (requestCode && !state.creds.registered) {
    // Baileys exposes requestPairingCode once the socket has been initialized.
    await new Promise(resolve => setTimeout(resolve, 1800));
    const code = await sock.requestPairingCode(phone);
    return String(code).replace(/(.{4})/g, '$1-').replace(/-$/, '');
  }
  return null;
}
app.get('/health', (_req, res) => res.json({ ok: true, service: 'KING MD WhatsApp Engine', activeSessions: sockets.size }));
app.post('/api/pair', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'Pairing request not authorized.' });
  const phone = cleanPhone(req.body?.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter a valid phone number including country code.' });
  const now = Date.now();
  if (requests.has(phone) && now - requests.get(phone) < 60000) return res.status(429).json({ success: false, error: 'Please wait one minute before requesting another code.' });
  requests.set(phone, now);
  try {
    const old = sockets.get(phone);
    if (old) { try { old.end(undefined); } catch (_) {} sockets.delete(phone); }
    const pairingCode = await startSession(phone, true);
    if (!pairingCode) throw new Error('WhatsApp did not return a pairing code.');
    return res.json({ success: true, pairingCode, phoneNumber: phone, message: 'Enter this code in WhatsApp Linked Devices.' });
  } catch (e) {
    console.error('Pairing error:', e.message);
    return res.status(502).json({ success: false, error: 'Could not generate a WhatsApp pairing code. Please try again shortly.' });
  }
});
app.post('/api/bots/status', (req, res) => {
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'Not authorized.' });
  const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers.map(cleanPhone).filter(Boolean).slice(0, 12) : [cleanPhone(req.body?.phoneNumber)].filter(Boolean);
  const bots = {};
  for (const phone of numbers) {
    const sock = sockets.get(phone);
    bots[phone] = started.has(phone) ? 'online' : (sock ? 'pairing' : 'offline');
  }
  res.json({ success: true, bots, connected: numbers.length === 1 && started.has(numbers[0]), status: numbers.length === 1 ? bots[numbers[0]] : 'ok' });
});
async function restoreSessions() {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  for (const name of fs.readdirSync(SESSION_DIR)) {
    if (/^\d{8,15}$/.test(name)) startSession(name, false).catch(e => console.error('Session restore failed:', name, e.message));
  }
}
const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => { console.log('KING MD pairing API listening on', port); restoreSessions().catch(console.error); });
