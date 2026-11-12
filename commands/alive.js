// KING MD - alive/status command
module.exports = async function aliveCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  await sock.sendMessage(from, {
    text: `👑 *KING MD IS ONLINE*\n\n✅ WhatsApp engine is running\n⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s\n⚙️ Node.js: ${process.version}\n📡 Commands loaded: ${(extra.commands || []).length}`
  }, { quoted: message });
};
