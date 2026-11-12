'use strict';
// KING MD - commands/channelstatus.js - REPLY VERSION - REAL FIX

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
  // Try invite - this is the CORRECT way for invite codes like 0029Vb9...
  try {
    const meta = await sock.newsletterMetadata('invite', raw);
    if (meta?.id) return meta.id;
    if (meta?.thread_metadata?.id) return meta.thread_metadata.id;
  } catch (e) { console.log('[channel] invite metadata fail:', e.message); }
  // Some forks have newsletterFromUrl
  try {
    if (typeof sock.newsletterFromUrl === 'function') {
      const meta2 = await sock.newsletterFromUrl('https://whatsapp.com/channel/' + raw);
      if (meta2?.id) return meta2.id;
    }
  } catch (_) {}
  return null;
}

// --- TRY EVERY WAY BAILEYS CAN POST TO CHANNEL ---
async function sendToChannel(sock, channelJid, content, isMedia) {
  const text = content.text || content.caption || '';
  const lastError = { msg: '' };

  // 1. Try newsletterSendMessage with STRING (some forks want string)
  if (typeof sock.newsletterSendMessage === 'function' && !isMedia) {
    try { return await sock.newsletterSendMessage(channelJid, text, {}); }
    catch (e) { lastError.msg = 'newsletterSendMessage(string): ' + e.message; console.log(lastError.msg); }
    // 2. Try newsletterSendMessage with OBJECT
    try { return await sock.newsletterSendMessage(channelJid, content, {}); }
    catch (e) { lastError.msg = 'newsletterSendMessage(obj): ' + e.message; console.log(lastError.msg); }
  }

  // 3. Try normal sendMessage - works on MANY forks for channels
  try { return await sock.sendMessage(channelJid, content); }
  catch (e) { lastError.msg = 'sendMessage: ' + e.message; console.log(lastError.msg); }

  // 4. Try sendMessage with type option
  try { return await sock.sendMessage(channelJid, content, { newsletter: true }); }
  catch (e) { lastError.msg = 'sendMessage+newsletter: ' + e.message; console.log(lastError.msg); }

  throw new Error(lastError.msg || 'All channel send methods failed');
}

function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo || {};
  return { quoted: ctx.quotedMessage || null, participant: ctx.participant || null, stanzaId: ctx.stanzaId || null };
}
function getQuotedText(quoted) {
  if (!quoted) return '';
  return quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || quoted.documentMessage?.caption || '';
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
    if (linkMatch) { channelLink = linkMatch[0]; postText = fullText.replace(linkMatch[0], '').replace(/^\s*\|\s*/, '').trim(); }
    else if (fullText.includes('|')) { const parts = fullText.split('|'); channelLink = parts[0].trim(); postText = parts.slice(1).join('|').trim(); }
    else if (/^[A-Za-z0-9_-]{15,}$/.test(args[0] || '') && !postText.includes(' ')) { channelLink = args[0]; postText = ''; }

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
      await sock.sendMessage(from, { text: `*CHANNEL STATUS 📢*\n\nReply to photo/video/text with:\n.channelstatus https://whatsapp.com/channel/CODE` }, { quoted: msg });
      await react(sock, msg, '✅'); return;
    }
    const channelJid = await resolveChannelJid(sock, channelLink);
    if (!channelJid) {
      await sock.sendMessage(from, { text: `Channel not found.\nLink used: ${channelLink}\nAvailable newsletter funcs: ${Object.keys(sock).filter(k=>k.toLowerCase().includes('newsletter')).join(', ')}` }, { quoted: msg });
      await react(sock, msg, '❌'); return;
    }
    const footer = '\n\n> 👑 KING MD 👑';
    try {
      if (media?.type === 'video') await sendToChannel(sock, channelJid, { video: media.buffer, caption: (postText || 'KING MD 👑') + footer }, true);
      else if (media?.type === 'image') await sendToChannel(sock, channelJid, { image: media.buffer, caption: (postText || 'KING MD 👑') + footer }, true);
      else if (media?.type === 'document') await sendToChannel(sock, channelJid, { document: media.buffer, fileName: 'file', caption: postText + footer }, true);
      else await sendToChannel(sock, channelJid, { text: postText + footer }, false);
      await sock.sendMessage(from, { text: `*Posted to Channel ✅*\n\nChannel JID: ${channelJid}\nType: ${media ? media.type : 'text'}\nCaption: ${postText || 'No caption'}` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      console.log('[channelstatus] FINAL error:', e);
      await sock.sendMessage(from, { text: `Could not post.\nChannel JID found: ${channelJid}\nReal Error: ${e.message}\n\nSend me this full error + your package.json baileys name.` }, { quoted: msg });
      await react(sock, msg, '❌');
    }
  }
};
