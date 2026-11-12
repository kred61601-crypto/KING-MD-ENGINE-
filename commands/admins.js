// KING MD - list group admins
module.exports = async function adminsCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: 'This command only works in groups.' }, { quoted: message });
  const meta = await sock.groupMetadata(from);
  const admins = (meta.participants || []).filter(p => p.admin);
  const lines = admins.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`);
  await sock.sendMessage(from, { text: `🛡️ *GROUP ADMINS*\n\n${lines.join('\n') || 'No admins found.'}`, mentions: admins.map(p => p.id) }, { quoted: message });
};
