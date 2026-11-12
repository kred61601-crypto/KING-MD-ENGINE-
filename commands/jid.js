// KING MD - jid command
module.exports = async function jidCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const quoted = message.message?.extendedTextMessage?.contextInfo?.participant;
  const target = quoted || message.key.participant || from;
  await sock.sendMessage(from, { text: `🆔 *JID*\n\n${target}` }, { quoted: message });
};
