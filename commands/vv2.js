function isOnlyEmoji(text) {
  const t = String(text || '').trim();
  if (!t || t.startsWith('.') || t.startsWith('!')) return false;
  if (t.length > 20) return false;
  const noEmoji = t.replace(/[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D❤️🧡💛💚💙💜🖤🤍🤎💕🥰😍😘💖💘💓💞💗]/gu, '').trim();
  if (noEmoji.length > 0) return false;
  return true;
}

function getQuotedViewOnce(msg) {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo || {};
    const quoted = ctx.quotedMessage;
    if (!quoted) return null;
    const inner = quoted.viewOnceMessage?.message || quoted.viewOnceMessageV2?.message || quoted.ephemeralMessage?.message?.viewOnceMessage?.message || quoted.ephemeralMessage?.message?.viewOnceMessageV2?.message || null;
    if (!inner) return null;
    return { quoted, inner, participant: ctx.participant, stanzaId: ctx.stanzaId };
  } catch (_) { return null; }
}

async function handleVV2(sock, msg, extra = {}) {
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!isOnlyEmoji(text)) return false;

  const found = getQuotedViewOnce(msg);
  if (!found) return false;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || from;
  const senderNum = senderJid.split('@')[0].split(':')[0];
  const ownerJid = senderNum + '@s.whatsapp.net';

  try {
    const fake = {
      key: { remoteJid: from, id: found.stanzaId, participant: found.participant, fromMe: false },
      message: found.inner
    };
    const download = extra.downloadMediaMessage;
    if (!download) return false;
    const buffer = await download(fake);
    if (!buffer) return true;

    if (found.inner.imageMessage) {
      await sock.sendMessage(ownerJid, { image: buffer, caption: `*View Once Saved 👀*\nFrom: +${found.participant ? found.participant.split('@')[0] : senderNum}\n\n> 👑 KING MD - VV2 👑` });
    } else if (found.inner.videoMessage) {
      await sock.sendMessage(ownerJid, { video: buffer, caption: `*View Once Video Saved 👀*\nFrom: +${found.participant ? found.participant.split('@')[0] : senderNum}\n\n> 👑 KING MD - VV2 👑` });
    } else if (found.inner.audioMessage) {
      await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
    }
    return true;
  } catch (_) {
    return true;
  }
}

module.exports = {
  name: 'vv2',
  alias: ['vv', 'viewonce', 'view'],
  desc: 'Reply any emoji to View Once to save it silently to DM',
  category: 'general',
  handleVV2,
  async execute(sock, msg, args, extra = {}) {
    await sock.sendMessage(msg.key.remoteJid, { text: `*VV2 👀 - Silent*\n\nReply to any View Once with any emoji ❤️💕🥰\nBot sends it to your DM silently. No react, no message in group.` }, { quoted: msg });
  }
};
