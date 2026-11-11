// KING MD V4 - commands/tiktok.js - FIXED - NO ruhend, NO lib/api 👑
// main.js calls: handler(sock, message, { text, args, from, channel, website, config, axios, fetch })
const axiosLib = require('axios');
const fetchLib = require('node-fetch');

const processedMessages = new Set();
const TT_PATTERNS = [
  /https?:\/\/(?:www\.)?tiktok\.com\//i,
  /https?:\/\/(?:vm\.|vt\.)?tiktok\.com\//i,
];

function extractUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[)\]>.,]+$/g, '') : '';
}

function captionFor(title, extra = {}) {
  const bot = (extra.config?.botName || 'KING MD').toUpperCase();
  return title ? `*DOWNLOADED BY ${bot}* 👑\n\n📝 ${title}` : `*DOWNLOADED BY ${bot}* 👑`;
}

// ===== FIXED: Resolve vm.tiktok.com short link to real tiktok.com link =====
async function resolveShortLink(url, fetch) {
  try {
    // vm.tiktok.com redirects to www.tiktok.com/@user/video/...
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' } });
    const finalUrl = res.url || url;
    console.log('[KING MD tiktok] Resolved:', url, '->', finalUrl);
    return finalUrl;
  } catch (e) {
    console.log('[KING MD tiktok] Resolve fail, using original:', e.message);
    return url;
  }
}

// ===== Try 4 APIs - one will work =====
async function tryApis(url, axios, fetch) {
  const errors = [];

  // 1. TikWM - BEST, FREE, NO KEY
  try {
    console.log('[KING MD tiktok] Trying TikWM...');
    const r = await axios.get('https://www.tikwm.com/api/?url=' + encodeURIComponent(url), { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const d = r.data?.data;
    if (d?.play) {
      return { title: d.title || 'TikTok Video', download: d.play, cover: d.cover, images: null, music: d.music };
    }
    if (d?.images?.length) {
      return { title: d.title || 'TikTok Video', images: d.images, audio: d.music || null, download: null };
    }
    errors.push('TikWM: no play url');
  } catch (e) { errors.push('TikWM: ' + e.message); console.log('[KING MD tiktok] TikWM fail:', e.message); }

  // 2. TikWM backup domain
  try {
    console.log('[KING MD tiktok] Trying TikWM backup...');
    const r = await axios.get('https://api.tikwm.com/api/?url=' + encodeURIComponent(url), { timeout: 30000 });
    const d = r.data?.data;
    if (d?.play) return { title: d.title || 'TikTok Video', download: d.play, cover: d.cover };
    errors.push('TikWM2: no play');
  } catch (e) { errors.push('TikWM2: ' + e.message); }

  // 3. Apiziaul - SAME as your .play API, works for TikTok too
  try {
    console.log('[KING MD tiktok] Trying Apiziaul...');
    const r = await axios.get('https://apiziaul.vercel.app/api/downloader/tiktok?url=' + encodeURIComponent(url), { timeout: 30000 });
    const d = r.data;
    const dl = d?.result?.video?.noWatermark || d?.result?.downloadUrl || d?.result?.url || d?.downloadUrl || d?.url;
    if (dl) return { title: d?.result?.title || 'TikTok Video', download: dl };
    errors.push('Apiziaul: no url');
  } catch (e) { errors.push('Apiziaul: ' + e.message); console.log('[KING MD tiktok] Apiziaul fail:', e.message); }

  // 4. SSSTik / TikCDN via tikwm video2
  try {
    console.log('[KING MD tiktok] Trying TikWM hd...');
    const r = await axios.get('https://www.tikwm.com/api/?url=' + encodeURIComponent(url) + '&hd=1', { timeout: 30000 });
    const d = r.data?.data;
    if (d?.hdplay) return { title: d.title || 'TikTok Video', download: d.hdplay };
    errors.push('TikWM HD: no hdplay');
  } catch (e) { errors.push('TikWM HD: ' + e.message); }

  throw new Error(errors.join(' | '));
}

async function tiktokCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const args = extra.args || [];
  const axios = extra.axios || axiosLib;
  const fetch = extra.fetch || fetchLib;

  try {
    if (processedMessages.has(message.key.id)) return;
    processedMessages.add(message.key.id);
    setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

    const fullText = args.join(' ') || extra.text || message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const url = extractUrl(fullText);

    if (!url) {
      return sock.sendMessage(from, { text: `*KING MD TIKTOK* 👑\n\nPlease provide a TikTok link.\nExample: \`.tiktok https://vm.tiktok.com/ZSpa9xDD4/\`` }, { quoted: message });
    }
    if (!TT_PATTERNS.some((p) => p.test(url))) {
      return sock.sendMessage(from, { text: '❌ That is not a valid TikTok link.' }, { quoted: message });
    }

    await sock.sendMessage(from, { react: { text: '🔄', key: message.key } }).catch(() => {});

    // 1. Resolve short link
    const realUrl = await resolveShortLink(url, fetch);

    // 2. Try APIs
    const dl = await tryApis(realUrl, axios, fetch);

    // 3. Photo slideshow - send images
    if (dl.images?.length && !dl.download) {
      for (const img of dl.images.slice(0, 5)) {
        await sock.sendMessage(from, { image: { url: img }, caption: captionFor(dl.title, extra) }, { quoted: message });
      }
      if (dl.audio) {
        const audioRes = await axios.get(dl.audio, { responseType: 'arraybuffer', timeout: 60000 });
        await sock.sendMessage(from, { audio: Buffer.from(audioRes.data), mimetype: 'audio/mpeg', fileName: 'tiktok-audio.mp3' }, { quoted: message });
      }
      await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});
      return;
    }

    if (!dl.download) throw new Error('No video URL from APIs');

    // 4. Download video buffer
    console.log('[KING MD tiktok] Downloading video:', dl.download);
    const videoRes = await axios.get(dl.download, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' },
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024
    });
    const video = Buffer.from(videoRes.data);
    if (!video.length) throw new Error('Empty video file');

    await sock.sendMessage(from, { video, mimetype: 'video/mp4', caption: captionFor(dl.title, extra) }, { quoted: message });
    await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});

  } catch (err) {
    console.error('[KING MD tiktok] FAILED:', err?.message || err);
    await sock.sendMessage(from, { text: `❌ *KING MD* 👑\n\nFailed to download TikTok video.\n\nReason: ${err?.message?.slice(0, 200) || 'API down'}\nTry again with a different link.` }, { quoted: message }).catch(() => {});
  }
}

tiktokCommand.execute = tiktokCommand;
tiktokCommand.handler = tiktokCommand;
tiktokCommand.run = tiktokCommand;
tiktokCommand.name = 'tiktok';
tiktokCommand.description = 'Download TikTok video';
tiktokCommand.category = 'download';

module.exports = tiktokCommand;
