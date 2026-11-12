// KING MD - view-once media retriever for media sent to the bot in a chat.
// Use .vv2 or .viewonce while replying to a view-once image/video.
module.exports = async function viewOnceCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const context = message.message?.extendedTextMessage?.contextInfo;
  const quoted = context?.quotedMessage;
  if (!quoted) return sock.sendMessage(from, { text: 'Reply to a view-once photo or video with *.vv2*.' }, { quoted: message });

  let content = quoted;
  for (const key of ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']) {
    if (content?.[key]?.message) content = content[key].message;
  }
  const type = Object.keys(content || {}).find(k => ['imageMessage', 'videoMessage'].includes(k));
  if (!type) return sock.sendMessage(from, { text: 'The replied message is not a supported view-once image or video.' }, { quoted: message });
  if (typeof extra.downloadMediaMessage !== 'function') return sock.sendMessage(from, { text: 'Media download is unavailable in this Baileys build.' }, { quoted: message });

  const quotedKey = {
    key: {
      remoteJid: from,
      id: context.stanzaId,
      participant: context.participant,
      fromMe: false
    },
    message: quoted
  };
  try {
    const buffer = await extra.downloadMediaMessage(quotedKey, 'buffer', {}, { logger: { info() {}, error() {}, warn() {}, debug() {}, trace() {}, child() { return this; } } });
    if (!buffer?.length) throw new Error('Empty media');
    const media = content[type];
    const payload = type === 'imageMessage'
      ? { image: buffer, caption: media.caption || '👑 KING MD' }
      : { video: buffer, caption: media.caption || '👑 KING MD' };
    await sock.sendMessage(from, payload, { quoted: message });
  } catch (error) {
    console.error('[KING MD] viewonce failed:', error.message);
    await sock.sendMessage(from, { text: 'Could not retrieve this media. It may have expired or this WhatsApp version may not support it.' }, { quoted: message });
  }
};
