async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
  } catch (_) {}
}

async function resolveChannelJid(sock, link) {
  const raw = String(link || '').trim();
  let id = raw;
  if (raw.includes('/channel/')) id = raw.split('/channel/')[1].split(/[?\/\s]/)[0];
  id = id.trim();
  if (!id) return null;
  if (id.includes('@newsletter')) return id;
  try {
    const meta = await sock.newsletterMetadata('jid', id + '@newsletter');
    if (meta?.id) return meta.id;
  } catch (_) {}
  try {
    const meta2 = await sock.newsletterMetadata('invite', id);
    if (meta2?.id) return meta2.id;
  } catch (_) {}
  return null;
}

function getQuoted(msg) {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo || {};
    return { quoted: ctx.quotedMessage || null, participant: ctx.participant || null, stanzaId: ctx.stanzaId || null };
  } catch (_) { return { quoted: null }; }
}

async function downloadQuoted(sock, msg, extra) {
  try {
    const { quoted, participant, stanzaId } = getQuoted(msg);
    if (!quoted) return null;
    const download = extra.downloadMediaMessage;
    if (!download) return null;
    const fake = { key: { remoteJid: msg.key.remoteJid, id: stanzaId, participant, fromMe: false }, message: quoted };
    const buffer = await download(fake);
    if (!buffer) return null;
    if (quoted.videoMessage) return { type: 'video', buffer, caption: quoted.videoMessage.caption || '' };
    if (quoted.imageMessage) return { type: 'image', buffer, caption: quoted.imageMessage.caption || '' };
    if (quoted.documentMessage) return { type: 'document', buffer, caption: quoted.documentMessage.caption || '' };
    return null;
  } catch (_) { return null; }
}

async function downloadOwnMedia(sock, msg, extra) {
  try {
    const m = msg.message || {};
    if (m.videoMessage) {
      const buf = await extra.downloadMediaMessage(msg);
      return { type: 'video', buffer: buf, caption: m.videoMessage.caption || '' };
    }
    if (m.imageMessage) {
      const buf = await extra.downloadMediaMessage(msg);
      return { type: 'image', buffer: buf, caption: m.imageMessage.caption || '' };
    }
    return null;
  } catch (_) { return null; }
}

module.exports = {
  name: 'channelstatus',
  alias: ['cstatus', 'channelpost', 'cpost', 'chstatus'],
  desc: 'Post text, photo or video to any channel',
  category: 'general',
  async execute(sock, msg, args, extra = {}) {
    await react(sock, msg, '📢');
    const from = msg.key.remoteJid;
    let fullText = args.join(' ').trim();

    const ownMedia = await downloadOwnMedia(sock, msg, extra);
    if (ownMedia) {
      const cap = ownMedia.caption.replace(/^\.(channelstatus|cstatus|channelpost|cpost|chstatus)\s*/i, '').trim();
      if (cap) fullText = cap;
    }
    const quotedMedia = !ownMedia ? await downloadQuoted(sock, msg, extra) : null;
    const media = ownMedia || quotedMedia;

    if (!fullText && !media) {
      await sock.sendMessage(from, {
        text: `*CHANNEL STATUS 📢 - Text / Photo / Video*\n\n*Text:*\n.channelstatus Hello everyone 👑\n\n*Your channel + text:*\n.channelstatus https://whatsapp.com/channel/CODE | Hello 🔥\n\n*Photo / Video:*\nSend photo/video with caption .channelstatus\nOR reply to any photo/video with .channelstatus\nOR reply to photo/video with .channelstatus https://whatsapp.com/channel/CODE | My caption\n\n*View channel:*\n.channelstatus view https://whatsapp.com/channel/CODE`
      }, { quoted: msg });
      await react(sock, msg, '✅');
      return;
    }

    if (fullText.toLowerCase().startsWith('view ')) {
      const link = fullText.slice(5).trim();
      const jid = await resolveChannelJid(sock, link);
      if (!jid) {
        await sock.sendMessage(from, { text: 'Channel not found.' }, { quoted: msg });
        await react(sock, msg, '❌');
        return;
      }
      try {
        const feed = await sock.newsletterFetch(jid);
        const last = feed?.messages?.[0]?.message?.conversation || feed?.messages?.[0]?.message?.extendedTextMessage?.text || 'Photo/Video post';
        await sock.sendMessage(from, { text: `*Channel:* ${feed?.metadata?.name || 'Channel'}\n*Latest:*\n${last}` }, { quoted: msg });
        await react(sock, msg, '✅');
      } catch (_) {
        await sock.sendMessage(from, { text: 'Could not fetch. Make bot follow that channel.' }, { quoted: msg });
        await react(sock, msg, '❌');
      }
      return;
    }

    let channelLink = extra.channelInvite || extra.channel || process.env.CHANNEL_INVITE || '0029Vb9AwScF6sn47ClubG1Z';
    let postText = fullText;

    if (fullText.includes('|')) {
      const parts = fullText.split('|');
      channelLink = parts[0].trim();
      postText = parts.slice(1).join('|').trim();
    } else if (fullText.includes('whatsapp.com/channel/')) {
      const words = fullText.split(/\s+/);
      channelLink = words[0];
      postText = words.slice(1).join(' ').trim();
    }

    if (media && !postText) postText = media.caption || '';
    if (!postText && !media) {
      await sock.sendMessage(from, { text: 'Add text or reply to photo/video.' }, { quoted: msg });
      await react(sock, msg, '❌');
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
      if (media?.type === 'video') {
        await sock.sendMessage(channelJid, { video: media.buffer, caption: (postText || 'KING MD 👑') + footer });
      } else if (media?.type === 'image') {
        await sock.sendMessage(channelJid, { image: media.buffer, caption: (postText || 'KING MD 👑') + footer });
      } else if (media?.type === 'document') {
        await sock.sendMessage(channelJid, { document: media.buffer, fileName: 'file', caption: postText + footer });
      } else {
        await sock.sendMessage(channelJid, { text: postText + footer });
      }
      await sock.sendMessage(from, { text: `*Posted to Channel ✅*\n\nType: ${media ? media.type : 'text'}\nCaption: ${postText || 'No caption'}\n\nIt will show in Updates like TEAM ARSLAN.` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await sock.sendMessage(from, { text: `Could not post. Add bot as Admin of that channel first.\nError: ${e.message}` }, { quoted: msg });
      await react(sock, msg, '❌');
    }
  }
};
