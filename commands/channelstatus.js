'use strict';
// KING MD - commands/channelstatus.js - REPLY VERSION
// Reply to ANYTHING with: .channelstatus <channel link>
// Reply to photo/video/text with: .channelstatus https://whatsapp.com/channel/CODE
// Or just: .channelstatus Hello KING (posts to default channel)

async function react(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }); } catch (_) {}
}

async function resolveChannelJid(sock, link) {
  let raw = String(link || '').trim();
  // Extract code from full link: whatsapp.com/channel/CODE
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

function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
    || {};
  return { quoted: ctx.quotedMessage || null, participant: ctx.participant || null, stanzaId: ctx.stanzaId || null, ctx };
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

    // --- 1. FIND CHANNEL LINK in args ---
    // Supports: full link, just CODE, or "link | caption"
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
    } else if (/^[A-Za-z0-9_-]{15,}$/.test(args[0] || '') && args.length >= 1 && !postText.includes(' ')) {
      // Just a CODE alone: .channelstatus 0029Vb9...
      channelLink = args[0];
      postText = '';
    }

    // --- 2. GET REPLIED THING ---
    const { quoted } = getQuoted(msg);
    const quotedText = getQuotedText(quoted);
    const ownMedia = await downloadOwnMedia(sock, msg, extra);
    const quotedMedia = !ownMedia ? await downloadQuotedMedia(sock, msg, extra) : null;
    const media = ownMedia || quotedMedia;

    // If user replied and didn't type a caption, use the replied text/caption
    if (!postText) {
      if (media?.caption) postText = media.caption.replace(/^\.(channelstatus|cstatus|channelpost|cpost|chstatus)\s*/i, '').trim();
      else if (quotedText) postText = quotedText;
    }
    // If own media caption contains command, clean it
    if (media && postText) postText = postText.replace(/^\.(channelstatus|cstatus|channelpost|cpost|chstatus)\s*/i, '').trim();

    if (!postText && !media) {
      await sock.sendMessage(from, {
        text: `*CHANNEL STATUS 📢*\n\n*Reply to ANYTHING:*\nReply to photo/video/text with:\n.channelstatus https://whatsapp.com/channel/CODE\n\n*Or post new text:*\n.channelstatus Hello KING 👑\n\n*Or post to your channel + caption:*\n.channelstatus https://whatsapp.com/channel/CODE | Hello 🔥\n\n*View channel:*\n.channelstatus view https://whatsapp.com/channel/CODE`
      }, { quoted: msg });
      await react(sock, msg, '✅');
      return;
    }

    if (postText.toLowerCase().startsWith('view ')) {
      const link = postText.slice(5).trim();
      const jid = await resolveChannelJid(sock, link);
      if (!jid) { await sock.sendMessage(from, { text: 'Channel not found.' }, { quoted: msg }); await react(sock, msg, '❌'); return; }
      try {
        const feed = await sock.newsletterFetch(jid);
        const last = feed?.messages?.[0]?.message?.conversation || feed?.messages?.[0]?.message?.extendedTextMessage?.text || 'Photo/Video post';
        await sock.sendMessage(from, { text: `*Channel:* ${feed?.metadata?.name || 'Channel'}\n*Latest:*\n${last}` }, { quoted: msg });
        await react(sock, msg, '✅');
      } catch (_) { await sock.sendMessage(from, { text: 'Could not fetch. Make bot follow that channel.' }, { quoted: msg }); await react(sock, msg, '❌'); }
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
      if (media?.type === 'video') await sock.sendMessage(channelJid, { video: media.buffer, caption: (postText || 'KING MD 👑') + footer });
      else if (media?.type === 'image') await sock.sendMessage(channelJid, { image: media.buffer, caption: (postText || 'KING MD 👑') + footer });
      else if (media?.type === 'document') await sock.sendMessage(channelJid, { document: media.buffer, fileName: 'file', caption: postText + footer });
      else await sock.sendMessage(channelJid, { text: postText + footer });

      await sock.sendMessage(from, { text: `*Posted to Channel ✅*\n\nType: ${media ? media.type : 'text'}\nCaption: ${postText || 'No caption'}` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await sock.sendMessage(from, { text: `Could not post. Add bot as Admin of that channel first.\nError: ${e.message}` }, { quoted: msg });
      await react(sock, msg, '❌');
    }
  }
};
