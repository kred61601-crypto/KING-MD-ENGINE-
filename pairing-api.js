const express = require('express');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
const PORT = Number(process.env.PORT || process.env.PAIR_API_PORT || 10000);
const BRIDGE_KEY = 'uFOg2BeCn3EJV6tf1fdXbsMSwshScKuzFDQwvoh68jx59ftO';
const SESSION_ROOT = process.env.PAIR_SESSION_DIR || path.join(__dirname, 'pair_sessions');
fs.mkdirSync(SESSION_ROOT, { recursive: true });
const sockets = new Map();
const pending = new Map();
const attempts = new Map();
const logger = pino({ level: 'silent' });
function cleanPhone(value) { return String(value || '').replace(/\D/g, ''); }
app.get('/', (_req, res) => res.json({ status:'ok', service:'KING MD pairing API' }));
app.get('/health', (_req, res) => res.json({ status:'ok', service:'KING MD pairing API' }));
app.post('/api/pair', async (req, res) => {
  if (req.get('x-pair-bridge-key') !== BRIDGE_KEY) return res.status(403).json({ success:false, error:'Forbidden' });
  const phone = cleanPhone(req.body && req.body.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success:false, error:'Enter a valid international phone number.' });
  const now = Date.now();
  const last = attempts.get(phone) || 0;
  if (now - last < 60000) return res.status(429).json({ success:false, error:'Please wait one minute before requesting another code for this number.' });
  attempts.set(phone, now);
  if (pending.has(phone)) return res.status(409).json({ success:false, error:'A pairing request is already running for this number. Please wait.' });
  pending.set(phone, true);
  try {
    const sessionDir = path.join(SESSION_ROOT, phone);
    fs.mkdirSync(sessionDir, { recursive:true });
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({ auth:state, logger, printQRInTerminal:false, browser:Browsers.macOS('Desktop'), markOnlineOnConnect:false, connectTimeoutMs:60000, defaultQueryTimeoutMs:60000 });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', update => {
      if (update.connection === 'open') { sockets.set(phone, sock); }
      if (update.connection === 'close') {
        const code = update.lastDisconnect && update.lastDisconnect.error && update.lastDisconnect.error.output && update.lastDisconnect.error.output.statusCode;
        if (code === DisconnectReason.loggedOut) sockets.delete(phone);
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1800));
    const code = await sock.requestPairingCode(phone);
    sockets.set(phone, sock);
    res.json({ success:true, pairingCode:String(code).replace(/(.{4})/, '$1-'), message:'Enter this code in WhatsApp > Linked devices > Link with phone number.' });
  } catch (error) {
    console.error('Pairing API error:', error && error.message || error);
    res.status(500).json({ success:false, error:'WhatsApp could not issue a pairing code. Check the number and try again.' });
  } finally { pending.delete(phone); }
});
app.listen(PORT, '0.0.0.0', () => console.log('KING MD pairing API listening on ' + PORT));
