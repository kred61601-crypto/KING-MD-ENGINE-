// KING MD - WhatsApp Channel post reaction command
// Usage:
//   .channelreact <channel-post-link> [emoji]
//   .channelreact <channel-link> <message-id> [emoji]
'use strict';

const DEFAULT_EMOJIS = ['❤️', '🔥', '👍', '😂', '😮', '🙏'];

function parseInput(args) {
  const first = String(args?.[0] || '').trim();
  if (!first) return null;

  // A shared channel-post URL commonly contains both the invite code and
  // the server message ID in its path.
  if (/^https?:\/\//i.test(first)) {
    let url;
    try { url = new URL(first); } catch { return null; }
    const parts = url.pathname.split('/').filter(Boolean);
    const channelIndex = parts.findIndex(p => p.toLowerCase() === 'channel');
    if (channelIndex < 0 || !parts[channelIndex + 1]) return null;
    const channel = parts[channelIndex + 1];
    const messageId = parts[channelIndex + 2] || args?.[1];
    const emoji = parts[channelIndex + 2] ? (args?.[1] || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]) : (args?.[2] || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]);
    return { channel, messageId: String(messageId || '').trim(), emoji };
  }

  // Also accept a channel JID/invite code followed by the server message ID.
  const channel = first.replace(/^https?:\/\//i, '').trim();
  const messageId = String(args?.[1] || '').trim();
  const emoji = String(args?.[2] || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]);
  return { channel, messageId, emoji };
}

async function resolveChannel(sock, channel) {
  const value = String(channel || '').trim();
  if (!value) return null;
  if (value.endsWith('@newsletter')) return value;
  // First try an existing newsletter JID.
  try {
    const meta = await sock.newsletterMetadata('jid', value.includes('@') ? value : `${value}@newsletter`);
    if (meta?.id) return meta.id;
  } catch (_) {}
  // Then resolve a WhatsApp channel invite code.
  try {
    const meta = await sock.newsletterMetadata('invite', value);
    if (meta?.id) return meta.id;
  } catch (_) {}
  return null;
}

async function channelReact(sock, message, extra = {}) {
  const chat = extra.from || message.key.remoteJid;
  const parsed = parseInput(extra.args || []);
  if (!parsed || !parsed.messageId) {
    return sock.sendMessage(chat, {
      text: '📣 *KING MD CHANNEL REACT*\n\nUsage:\n.channelreact https://whatsapp.com/channel/INVITE_CODE/POST_ID ❤️\n\nOr:\n.channelreact INVITE_CODE POST_ID 🔥\n\nSend a link to a specific channel post, not just the channel homepage.'
    }, { quoted: message });
  }

  if (!/^[\w-]{1,80}$/.test(parsed.messageId)) {
    return sock.sendMessage(chat, { text: '❌ Invalid channel post ID. Copy the share link of the specific channel post.' }, { quoted: message });
  }

  try {
    const channelJid = await resolveChannel(sock, parsed.channel);
    if (!channelJid) {
      return sock.sendMessage(chat, { text: '❌ Could not resolve that channel. Check the channel link and make sure the bot can access it.' }, { quoted: message });
    }

    // Follow is best-effort; reaction still requires a valid post ID and
    // support in the installed Baileys build.
    try { await sock.newsletterFollow(channelJid); } catch (_) {}

    if (typeof sock.newsletterReact !== 'function') {
      throw new Error('This installed Baileys version does not expose newsletterReact. Update the Baileys dependency before using channel reactions.');
    }

    await sock.newsletterReact(channelJid, parsed.messageId, parsed.emoji);
    return sock.sendMessage(chat, {
      text: `✅ *KING MD CHANNEL REACT*\n\nReaction sent: ${parsed.emoji}\nChannel: ${channelJid}\nPost ID: ${parsed.messageId}`
    }, { quoted: message });
  } catch (error) {
    console.error('[KING MD] channelreact failed:', error.stack || error.message || error);
    return sock.sendMessage(chat, {
      text: `❌ Could not react to that channel post.\n${String(error.message || error).slice(0, 500)}\n\nCheck that the post link is valid and the bot has access to the channel.`
    }, { quoted: message });
  }
}

channelReact.execute = channelReact;
channelReact.description = 'React to a WhatsApp Channel post';
channelReact.aliases = ['creact', 'channelreaction'];
module.exports = channelReact;
