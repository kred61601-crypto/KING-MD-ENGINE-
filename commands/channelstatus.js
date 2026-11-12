'use strict';
// KING MD - commands/channelstatus.js - REPLY VERSION - FIXED FOR BAILEYS
// Reply to ANYTHING with: .channelstatus <channel link>

async function react(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }); } catch (_) {}
}

async function resolveChannelJid(sock, link) {
  let raw = String(link || '').trim();
  const m = raw.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (m) raw = m[1];
  else if (raw.includes('/channel/')) raw = raw.split('/channel/')[1].split(/[?\/\s]/)[0];
  raw = raw.trim();
  if (!raw) return null;
  if (raw.includes('@newsletter')) return raw;
  try {
    const meta = await sock.newsletterMetadata('jid', raw + '@newsletter');
    if (meta?.id) return meta.id;
  } catch (_) {}
  try {
    const meta2 = await sock.newsletterMetadata('invite', raw);
    if (meta2?.id) return meta2.id;
  } catch (_) {}
  return null;
}

// --- THE FIX: Send to channel the CORRECT Baileys way ---
async function sendToChannel(sock, channelJid, content) {
  // Method 1: newsletterSendMessage (Baileys 6.x - correct for channels)
  if (typeof sock.newsletterSendMessage === 'function') {
    return await sock.newsletterSendMessage(channelJid, content, {});
  }
  // Method 2: newsletterSendMsg (some forks)
  if (typeof sock.newsletterSendMsg === 'function') {
    return await sock.newsletterSendMsg(channelJid, content, {});
  }
  // Method 3: old sendMessage fallback
  return await sock.sendMessage(channelJid, content);
}

function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
    || {};
  return { quoted: ctx.quotedMessage || null, participant: ctx.participant || null, stanzaId: ctx.stanzaId || null };
}

function getQuotedText(quoted) {
  if (!quoted) return '';
  return quoted.conversation
    || quoted.extendedTextMessage?.text
    || quoted.imageMessage?.caption
    || quoted.videoMessage?.caption
    || quoted.documentMessage?.caption
    || '';
}

async function downloadQuotedMedia(sock, msg, extra) {
  const { quoted, participant, stanzaId } = getQuoted(msg);
  if (!quoted) return null;
  const download = extra.downloadMediaMessage || sock.downloadMediaMessage?.bind(sock);
  if (!download) return null;
  try {
    const fake = { key: { remoteJid: msg.key.remoteJid, id: stanzaId, participant, fromMe: false }, message: quoted };
    const buffer = await download(fake);
    if (!buffer) return null;
    if (quoted.videoMessage) return { type: 'video', buffer, caption: quoted.videoMessage.caption || '' };
    if (quoted.imageMessage) return { type: 'image', buffer, caption: quoted.imageMessage.caption || '' };
    if (quoted.documentMessage) return { type: 'document', buffer, caption: quoted.documentMessage.caption || '' };
  } catch (_) {}
  return null;
}

async function downloadOwnMedia(sock, msg, extra) {
  const m = msg.message || {};
  const download = extra.downloadMediaMessage || sock.downloadMediaMessage?.bind(sock);
  if (!download) return null;
  try {
    if (m.videoMessage) return { type: 'video', buffer: await download(msg), caption: m.videoMessage.caption || '' };
    if (m.imageMessage) return { type: 'image', buffer: await download(msg), caption: m.imageMessage.caption || '' };
  } catch (_) {}
  return null;
}

module.exports = {
  name: 'channelstatus',
  alias: ['cstatus', 'channelpost', 'cpost', 'chstatus'],
  desc: 'Reply to anything to post it to a channel',
  async execute(sock, msg, args, extra = {}) {
    await react(sock, msg, '📢');
    const from = extra.from || msg.key.remoteJid;
    let fullText = args.join(' ').trim();

    let channelLink = extra.channelInvite || extra.channel || process.env.CHANNEL_INVITE || '0029Vb9AwScF6sn47ClubG1Z';
    let postText = fullText;

    const linkMatch = fullText.match(/(https?:\/\/)?(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+/);
    if (linkMatch) {
      channelLink = linkMatch[0];
      postText = fullText.replace(linkMatch[0], '').replace(/^\s*\|\s*/, '').trim();
    } else if (fullText.includes('|')) {
      const parts = fullText.split('|');
      channelLink = parts[0].trim();
      postText = parts.slice(1).join('|').trim();
    } else if (/^[A-Za-z0-9_-]{15,}$/.test(args[0] || '') && !postText.includes(' ')) {
      channelLink = args[0];
      postText = '';
    }

    const { quoted } = getQuoted(msg);
    const quotedText = getQuotedText(quoted);
    const ownMedia = await downloadOwnMedia(sock, msg, extra);
    const quotedMedia = !ownMedia ? await downloadQuotedMedia(sock, msg, extra) : null;
    const media = ownMedia || quotedMedia;

    if (!postText) {
      if (media?.caption) postText = media.caption.replace(/^\.(channelstatus|cstatus|channelpost|cpost|chstatus)\s*/i, '').trim();
      else if (quotedText) postText = quotedText;
    }
    if (media && postText) postText = postText.replace(/^\.(channelstatus|cstatus|channelpost|cpost|chstatus)\s*/i, '').trim();

    if (!postText && !media) {
      await sock.sendMessage(from, {
        text: `*CHANNEL STATUS 📢*\n\n*Reply to ANYTHING:*\nReply to photo/video/text with:\n.channelstatus https://whatsapp.com/channel/CODE\n\n*Or post new text:*\n.channelstatus Hello KING 👑`
      }, { quoted: msg });
      await react(sock, msg, '✅');
      return;
    }

    const channelJid = await resolveChannelJid(sock, channelLink);
    if (!channelJid) {
      await sock.sendMessage(from, { text: 'Channel not found. Check link.' }, { quoted: msg });
      await react(sock, msg, '❌');
      return;
    }

    const footer = '\n\n> 👑 KING MD 👑';
    try {
      if (media?.type === 'video') await sendToChannel(sock, channelJid, { video: media.buffer, caption: (postText || 'KING MD 👑') + footer });
      else if (media?.type === 'image') await sendToChannel(sock, channelJid, { image: media.buffer, caption: (postText || 'KING MD 👑') + footer });
      else if (media?.type === 'document') await sendToChannel(sock, channelJid, { document: media.buffer, fileName: 'file', caption: postText + footer });
      else await sendToChannel(sock, channelJid, { text: postText + footer });

      await sock.sendMessage(from, { text: `*Posted to Channel ✅*\n\nType: ${media ? media.type : 'text'}\nCaption: ${postText || 'No caption'}` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      console.log('[channelstatus] real error:', e);
      await sock.sendMessage(from, { text: `Could not post.\nReal Error: ${e.message}\n\nBot is Admin already, so this is Baileys error, not admin. Tell KING what this error says.` }, { quoted: msg });
      await react(sock, msg, '❌');
    }
  }
};
