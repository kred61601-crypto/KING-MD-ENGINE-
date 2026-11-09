// KING MD pairing API bridge. Runs alongside the original bot process.
const express = require('express');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));

// FIXED: Render gives you PORT. Use it first.
const PORT = Number(process.env.PORT || process.env.PAIR_API_PORT || 10000);
const BRIDGE_KEY = 'uFOg2BeCn3EJV6tf1fdXbsMSwshScKuzFDQwvoh68jx59ftO';
const SESSION_ROOT = process.env.PAIR_SESSION_DIR || path.join(__dirname, 'pair_sessions');
fs.mkdirSync(SESSION_ROOT, { recursive: true });

const sockets = new Map();
const pending = new Map();
const attempts = new Map();
const logger = pino({ level: 'silent' });

function cleanPhone(value) { return String(value || '').replace(/\D/g, ''); }

// --- PAIRING PAGE (built into engine, no separate site needed) ---
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KING MD - Pair</title>
<style>
body{font-family:Arial;background:#0f0f0f;color:#fff;display:flex;justify-content:center;padding:20px}
.box{background:#1a1a1a;padding:22px;border-radius:14px;width:100%;max-width:380px;text-align:center}
input{width:100%;padding:13px;border-radius:10px;border:none;margin:12px 0;font-size:16px;box-sizing:border-box}
button{width:100%;padding:13px;border:none;border-radius:10px;background:#25D366;color:#000;font-weight:bold;font-size:16px;cursor:pointer}
#out{margin-top:16px;font-size:22px;font-weight:bold;letter-spacing:2px;word-break:break-all}
small{color:#aaa}
</style></head><body>
<div class="box">
<h2>👑 KING MD</h2>
<p>Enter your WhatsApp number with country code</p>
<p><small>Example: 254712345678</small></p>
<input id="phone" placeholder="2547XXXXXXXX" inputmode="numeric" />
<button onclick="getCode()">GET PAIRING CODE</button>
<div id="out"></div>
<p><small>Then: WhatsApp > Linked devices > Link with phone number > Enter code</small></p>
</div>
<script>
async function getCode(){
  const phone = document.getElementById('phone').value.trim();
  const out = document.getElementById('out');
  out.textContent = 'Please wait...';
  try{
    const r = await fetch('/api/pair', {method:'POST', headers:{'Content-Type':'application/json','x-pair-bridge-key':'${BRIDGE_KEY}'}, body: JSON.stringify({phoneNumber: phone})});
    const d = await r.json();
    if(d.success){ out.textContent = 'YOUR CODE: ' + d.pairingCode; }
    else { out.textContent = 'Error: ' + (d.error || 'Failed'); }
  }catch(e){ out.textContent = 'Network error. Engine is waking up, wait 30s and try again.'; }
}
</script></body></html>`);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'KING MD pairing API' }));

app.post('/api/pair', async (req, res) => {
  if (req.get('x-pair-bridge-key') !== BRIDGE_KEY) return res.status(403).json({ success: false, error: 'Forbidden' });
  const phone = cleanPhone(req.body && req.body.phoneNumber);
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter a valid international phone number.' });
  const now = Date.now();
  const last = attempts.get(phone) || 0;
  if (now - last < 60000) return res.status(429).json({ success: false, error: 'Please wait one minute before requesting another code for this number.' });
  attempts.set(phone, now);
  if (pending.has(phone)) return res.status(409).json({ success: false, error: 'A pairing request is already running for this number. Please wait.' });
  pending.set(phone, true);
  try {
    const sessionDir = path.join(SESSION_ROOT, phone);
    fs.mkdirSync(sessionDir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({ auth: state, logger, printQRInTerminal: false, browser: Browsers.macOS('Desktop'), markOnlineOnConnect: false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000 });
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
    res.json({ success: true, pairingCode: String(code).replace(/(.{4})/, '$1-'), message: 'Enter this code in WhatsApp > Linked devices > Link with phone number.' });
  } catch (error) {
    console.error('Pairing API error:', error && error.message || error);
    res.status(500).json({ success: false, error: 'WhatsApp could not issue a pairing code. Check the number and try again.' });
  } finally { pending.delete(phone); }
});

app.listen(PORT, '0.0.0.0', () => console.log('KING MD pairing API listening on ' + PORT));
