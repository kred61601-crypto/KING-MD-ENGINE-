'use strict';
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const commands = [...new Set((Array.isArray(extra.commands) ? extra.commands : []).map(x => String(x).toLowerCase()))].sort();
  const seconds = Math.floor(process.uptime());
  const runtime = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`;
  const time = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
  const lines = commands.map((name, i) => `${String(i + 1).padStart(2, '0')}. .${name}`);
  const menu = `╭━━━〔 👑 KING MD 👑 〕━━━╮\n┃ Status: ACTIVE 🟢\n┃ Time: ${time}\n┃ Uptime: ${runtime}\n┃ Commands loaded: ${commands.length}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n📌 *COMMAND MENU*\n${lines.length ? lines.join('\n') : 'No command files were loaded.'}\n\n🔰 *GROUP PROTECTION*\n.antilink on/off/status\n.antidelete on/off/status\n\n💡 Type any command with its arguments. Example:\n.tiktok https://www.tiktok.com/...\n\n> KING MD • Automatically lists commands installed in /commands`;
  const imagePaths = ['menu.jpg', 'menu.png', 'menu.jpeg'].map(f => path.join(__dirname, '..', 'assets', f));
  const imagePath = imagePaths.find(p => fs.existsSync(p));
  if (imagePath) return sock.sendMessage(from, { image: fs.readFileSync(imagePath), caption: menu }, { quoted: message });
  return sock.sendMessage(from, { text: menu }, { quoted: message });
}
helpCommand.execute = helpCommand;
helpCommand.description = 'Show all commands currently installed';
module.exports = helpCommand;
