// KING MD - group information command
module.exports = async function groupInfoCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: 'This command only works in groups.' }, { quoted: message });
  const meta = await sock.groupMetadata(from);
  const admins = (meta.participants || []).filter(p => p.admin).length;
  const text = `👑 *${meta.subject || 'Group information'}*\n\n🆔 JID: ${from}\n👥 Members: ${(meta.participants || []).length}\n🛡️ Admins: ${admins}\n👤 Created by: ${meta.owner || 'Unknown'}\n📅 Created: ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : 'Unknown'}`;
  await sock.sendMessage(from, { text }, { quoted: message });
};
