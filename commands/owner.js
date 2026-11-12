// KING MD - owner contact
module.exports = async function ownerCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const cfg = extra.config || {};
  const numbers = (cfg.ownerNumbers || [cfg.ownerNumber]).filter(Boolean).map(n => String(n).replace(/\D/g, '')).filter(Boolean);
  if (!numbers.length) return sock.sendMessage(from, { text: 'Owner contact is not configured.' }, { quoted: message });
  const mentions = numbers.map(n => `${n}@s.whatsapp.net`);
  await sock.sendMessage(from, { text: `👑 *KING MD OWNER*\n\n${numbers.map(n => `https://wa.me/${n}`).join('\n')}`, mentions }, { quoted: message });
};
