// KING MD - runtime command
module.exports = async function runtimeCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const total = Math.floor(process.uptime());
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  await sock.sendMessage(from, { text: `👑 *KING MD RUNTIME*\n\n⏱️ Uptime: ${h}h ${m}m ${s}s\n⚙️ Node.js: ${process.version}\n📦 Commands loaded: ${(extra.commands || []).length}` }, { quoted: message });
};
