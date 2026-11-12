'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'antidelete.json');
function read() { try { const v = JSON.parse(fs.readFileSync(FILE, 'utf8')); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function write(v) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(v, null, 2)); }
async function handler(sock, msg, extra = {}) {
  const chat = extra.from || msg.key.remoteJid;
  const action = String(extra.args?.[0] || '').toLowerCase();
  if (!['on', 'off', 'status'].includes(action)) return sock.sendMessage(chat, { text: 'Usage: .antidelete on | .antidelete off | .antidelete status\nWhen enabled, KING MD reports deleted messages it has received while online.' }, { quoted: msg });
  const data = read();
  if (action !== 'status') { data[chat] = action === 'on'; write(data); }
  return sock.sendMessage(chat, { text: `🗑️ Antidelete is *${data[chat] ? 'ON' : 'OFF'}* for this chat.` }, { quoted: msg });
}
handler.execute = handler; handler.description = 'Enable or disable deleted-message notifications'; module.exports = handler;
