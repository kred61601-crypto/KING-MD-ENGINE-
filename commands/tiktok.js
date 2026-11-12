'use strict';
// KING MD - commands/tiktok.js - PRIVATE + PUBLIC - uses YOUR cookie
const axios = require('axios');

module.exports = {
  name: 'tiktok',
  alias: ['tt', 'tik'],
  async execute(sock, msg, args, extra = {}) {
    const from = extra.from || msg.key.remoteJid;
    const url = (args[0] || '').trim();
    if (!url || !url.includes('tiktok.com')) {
      await sock.sendMessage(from, { text: `❌ Usage: *.tiktok <link>*` }, { quoted: msg });
      return;
    }

    // YOUR TikTok cookie from Render Env - needed for PRIVATE videos
    const COOKIE = process.env.TIKTOK_COOKIE || '';
    if (!COOKIE) {
      // Still try public first, but warn if it fails
    }

    let finalUrl = url;
    try {
      const r = await axios.get(url, { maxRedirects: 5, headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15', ...(COOKIE ? { Cookie: COOKIE } : {}) }, timeout: 15000 });
      if (r.request?.res?.responseUrl) finalUrl = r.request.res.responseUrl;
    } catch (_) {}

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'application/json',
      ...(COOKIE ? { Cookie: COOKIE } : {})
    };

    let data = null;
    let isPrivate = false;
    try {
      const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(finalUrl)}`, { headers, timeout: 20000 });
      data = res.data?.data;
      if (res.data?.msg === 'private' || data?.is_private) isPrivate = true;
    } catch (e) {
      if (String(e.response?.status) === '403') isPrivate = true;
      try {
        const res2 = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(finalUrl)}`, { headers, timeout: 20000 });
        data = res2.data?.data;
      } catch (_) {}
    }

    if (!data?.play) {
      await sock.sendMessage(from, {
        text: `🔒 *PRIVATE TIKTOK DETECTED*\n\nThis video is Private, bot can't download it without login.\n\n*How to fix:*\n1. Go to tiktok.com on Chrome, login with an account that FOLLOWS this private account\n2. Copy your Cookie\n3. Add it to Render Env: \`TIKTOK_COOKIE = your-cookie-here\`\n4. Redeploy, try again\n\n*Quick fix:* Ask owner to make video Public for 1 min, download it, then make it Private again.\n\n> KING-MD-V4 👑`
      }, { quoted: msg });
      return;
    }

    const title = data.title || 'TikTok Video';
    const author = data.author?.nickname || data.author?.unique_id || 'TikTok';
    const duration = data.duration ? `${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}` : '0:00';
    const views = data.play_count ? Number(data.play_count).toLocaleString() : '0';
    const likes = data.digg_count ? Number(data.digg_count).toLocaleString() : '0';
    const cover = data.cover || data.origin_cover;
    const videoUrl = data.play;

    const card = `• 𝐊𝐈𝐍𝐆 𝐌𝐃 𝐓𝐈𝐊𝐓𝐎𝐊 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 🎬👑\n\n┌───➤\n│ 🎵 𝐓𝐢𝐭𝐥𝐞 - ${title}\n│ ⏱️ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧 - ${duration}\n│ 👁️ 𝐕𝐢𝐞𝐰𝐬 - ${views}\n│ ❤️ 𝐋𝐢𝐤𝐞𝐬 - ${likes}\n│ 👤 𝐀𝐮𝐭𝐡𝐨𝐫 - ${author}\n│ 📥 𝐒𝐭𝐚𝐭𝐮𝐬 - Downloading...\n└───➤\n\nPowered by 𝐊𝐈𝐍𝐆 𝐌𝐃 👑`;

    try {
      if (cover) {
        const thumb = await axios.get(cover, { responseType: 'arraybuffer', headers, timeout: 20000 });
        await sock.sendMessage(from, { image: Buffer.from(thumb.data), caption: card }, { quoted: msg });
      } else await sock.sendMessage(from, { text: card }, { quoted: msg });
    } catch (_) { await sock.sendMessage(from, { text: card }, { quoted: msg }); }

    try {
      const vid = await axios.get(videoUrl, { responseType: 'arraybuffer', headers, timeout: 60000 });
      await sock.sendMessage(from, { video: Buffer.from(vid.data), caption: `• 𝐊𝐈𝐍𝐆 𝐌𝐃 𝐓𝐈𝐊𝐓𝐎𝐊 🎬👑\n\n🎵 ${title}\n👤 ${author}\n\nPowered by 𝐊𝐈𝐍𝐆 𝐌𝐃 👑` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `✅ Found video but couldn't send file.\nLink: ${videoUrl}` }, { quoted: msg });
    }
  }
};
