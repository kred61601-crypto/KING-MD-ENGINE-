'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'antilink.json');
function read() { try { const v = JSON.parse(fs.readFileSync(FILE, 'utf8')); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function write(v) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(v, null, 2)); }
async function isAdmin(sock, jid, sender) {
  if (!jid.endsWith('@g.us')) return false;
  try { const md = await sock.groupMetadata(jid); return (md.participants || []).some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')); } catch { return false; }
}
async function handler(sock, msg, extra = {}) {
  const chat = extra.from || msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!chat.endsWith('@g.us')) return sock.sendMessage(chat, { text: '❌ Antilink works in groups only.' }, { quoted: msg });
  if (!(await isAdmin(sock, chat, sender))) return sock.sendMessage(chat, { text: '❌ Only group admins can change antilink.' }, { quoted: msg });
  const action = String(extra.args?.[0] || '').toLowerCase();
  if (!['on', 'off', 'status'].includes(action)) return sock.sendMessage(chat, { text: 'Usage: .antilink on | .antilink off | .antilink status' }, { quoted: msg });
  const data = read();
  if (action !== 'status') { data[chat] = action === 'on'; write(data); }
  return sock.sendMessage(chat, { text: `🔗 Antilink is *${data[chat] ? 'ON' : 'OFF'}* in this group.\n${data[chat] ? 'Non-admin link messages will be deleted.' : 'Links are allowed.'}` }, { quoted: msg });
}
handler.execute = handler; handler.description = 'Enable or disable group link protection'; module.exports = handler;
