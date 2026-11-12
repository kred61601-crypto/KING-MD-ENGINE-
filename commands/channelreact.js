'use strict';
// KING MD - commands/channelreact.js - FRESH
// Usage:
//   .channelreact https://whatsapp.com/channel/INVITE_CODE/POST_ID ❤️
//   .channelreact INVITE_CODE POST_ID 🔥

const DEFAULT_EMOJIS = ['❤️', '🔥', '👍', '😂', '😮', '🙏'];

function parseInput(args) {
  const first = String(args?.[0] || '').trim();
  if (!first) return null;

  // 1. Full channel post link: https://whatsapp.com/channel/INVITE/POST_ID
  if (/^https?:\/\//i.test(first)) {
    let url;
    try { url = new URL(first); } catch { return null; }
    const parts = url.pathname.split('/').filter(Boolean);
    const channelIndex = parts.findIndex(p => p.toLowerCase() === 'channel');
    if (channelIndex < 0 || !parts[channelIndex + 1]) return null;

    const channel = parts[channelIndex + 1];
    const messageId = parts[channelIndex + 2] || args?.[1];
    // If link already has POST_ID, emoji is args[1], else emoji is args[2]
    const emoji = parts[channelIndex + 2]
      ? (args?.[1] || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)])
      : (args?.[2] || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]);

    return { channel, messageId: String(messageId || '').trim(), emoji };
  }

  // 2. INVITE_CODE POST_ID EMOJI
  const channel = first.replace(/^https?:\/\//i, '').trim();
  const messageId = String(args?.[1] || '').trim();
  const emoji = String(args?.[2] || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]);
  return { channel, messageId, emoji };
}

async function resolveChannel(sock, channel) {
  const value = String(channel || '').trim();
  if (!value) return null;
  if (value.endsWith('@newsletter')) return value;

  // Try as JID first
  try {
    const meta = await sock.newsletterMetadata('jid', value.includes('@') ? value : `${value}@newsletter`);
    if (meta?.id) return meta.id;
  } catch (_) {}

  // Then as invite code
  try {
    const meta = await sock.newsletterMetadata('invite', value);
    if (meta?.id) return meta.id;
  } catch (_) {}

  return null;
}

module.exports = {
  name: 'channelreact',
  alias: ['creact', 'channelreaction', 'creaction'],
  description: 'React to a WhatsApp Channel post',

  async execute(sock, msg, args, extra = {}) {
    const from = extra.from || msg.key.remoteJid;
    const parsed = parseInput(args);

    if (!parsed || !parsed.messageId) {
      await sock.sendMessage(from, {
        text: `📣 *KING MD CHANNEL REACT*\n\nUsage:\n.channelreact https://whatsapp.com/channel/INVITE_CODE/POST_ID ❤️\n\nOr:\n.channelreact INVITE_CODE POST_ID 🔥\n\nSend a link to a specific channel post, not just the channel homepage.`
      }, { quoted: msg });
      return;
    }

    if (!/^[\w-]{1,80}$/.test(parsed.messageId)) {
      await sock.sendMessage(from, { text: `❌ Invalid channel post ID. Copy the share link of the specific channel post.` }, { quoted: msg });
      return;
    }

    try {
      const channelJid = await resolveChannel(sock, parsed.channel);
      if (!channelJid) {
        await sock.sendMessage(from, { text: `❌ Could not resolve that channel. Check the channel link and make sure the bot can access it.` }, { quoted: msg });
        return;
      }

      // Follow is best-effort
      try { await sock.newsletterFollow(channelJid); } catch (_) {}

      if (typeof sock.newsletterReact !== 'function') {
        throw new Error('This Baileys version does not expose newsletterReact. Update Baileys.');
      }

      await sock.newsletterReact(channelJid, parsed.messageId, parsed.emoji);

      await sock.sendMessage(from, {
        text: `✅ *KING MD CHANNEL REACT*\n\nReaction sent: ${parsed.emoji}\nChannel: ${channelJid}\nPost ID: ${parsed.messageId}\n\n> KING-MD-V4 👑`
      }, { quoted: msg });

    } catch (error) {
      console.error('[KING MD] channelreact failed:', error.stack || error.message || error);
      await sock.sendMessage(from, {
        text: `❌ Could not react to that channel post.\n${String(error.message || error).slice(0, 500)}\n\nCheck that the post link is valid and the bot has access to the channel.`
      }, { quoted: msg });
    }
  }
};
