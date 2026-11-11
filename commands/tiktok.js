// KING MD V4 - commands/tiktok.js - FIXED FOR REAL main.js 👑
// main.js calls: handler(sock, message, { text, args, from, channel, website, settings, config, axios, fetch })
const axiosLib = require('axios');

// ===== SAFE REQUIRES - Don't crash if lib missing =====
function safeRequire(p) { try { return require(p); } catch (e) { console.log('[KING MD TikTok] Skip lib', p); return null; } }
const settingsFile = safeRequire('../settings');
const configFile = safeRequire('../config');
const APIs = safeRequire('../lib/api');
const waVideoLib = safeRequire('../lib/waVideo');
const ruhend = safeRequire('ruhend-scraper');
const ttdl = ruhend?.ttdl || null;

const processedMessages = new Set();

const TT_PATTERNS = [
  /https?:\/\/(?:www\.)?tiktok\.com\//i,
  /https?:\/\/(?:vm\.)?tiktok\.com\//i,
  /https?:\/\/(?:vt\.)?tiktok\.com\//i,
];

function extractUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[)\]>.,]+$/g, '') : '';
}

function tikTokUrlVariants(url) {
  const variants = [url];
  const m = String(url).match(/^(https?:\/\/(?:vt|vm)\.tiktok\.com\/)([A-Za-z0-9]+)(\/?.*)?$/i);
  if (!m) return variants;
  const upper = `${m[1]}${m[2].toUpperCase()}${m[3] || '/'}`;
  const lower = `${m[1]}${m[2].toLowerCase()}${m[3] || '/'}`;
  for (const v of [upper, lower]) {
    if (!variants.includes(v)) variants.push(v);
  }
  return variants;
}

function captionFor(title, extra = {}) {
  const bot = (extra.config?.botName || configFile?.botName || settingsFile?.botName || 'KING MD').toUpperCase();
  const channel = extra.channel ? `\n\nChannel: ${extra.channel}` : '';
  return title ? `*DOWNLOADED BY ${bot}* 👑\n\n📝 ${title}${channel}` : `*DOWNLOADED BY ${bot}* 👑${channel}`;
}

const TT_HEADERS = {
  Referer: 'https://www.tiktok.com/',
  Origin: 'https://www.tiktok.com',
  'Accept-Encoding': 'identity',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ===== FALLBACK: If lib/waVideo missing, download via axios =====
async function fetchVideoBuffer(url, axios) {
  if (waVideoLib?.fetchWhatsAppVideo) {
    return await waVideoLib.fetchWhatsAppVideo(url, TT_HEADERS);
  }
  // Fallback - direct axios buffer
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000, headers: TT_HEADERS, maxContentLength: 50 * 1024 * 1024 });
  return Buffer.from(res.data);
}

async function scraperTikTokDownload(url) {
  if (!ttdl) throw new Error('ruhend-scraper not installed');
  const data = await ttdl(url);
  const direct = data?.video_hd || data?.video || data?.video_wm || data?.hdplay || data?.play || null;
  if (direct && /^https?:\/\//i.test(direct)) {
    return { title: data.title || 'TikTok Video', thumbnail: data.cover || null, download: direct };
  }
  if (data?.data?.length) {
    const video = data.data.find((m) => m.type === 'video' || /\.(mp4|mov|webm)$/i.test(m.url || '')) || data.data[0];
    if (video?.url) return { title: data.title || 'TikTok Video', download: video.url };
  }
  throw new Error('No video URL found');
}

async function resolveTikTok(url) {
  const errors = [];

  // 1. Try Knight API if lib exists
  if (APIs?.knightTikTokDownload) {
    for (const candidate of tikTokUrlVariants(url)) {
      try {
        const dl = await APIs.knightTikTokDownload(candidate);
        if (dl?.download && /^https?:\/\//i.test(dl.download)) {
          console.log(`[KING MD tiktok] Knight OK video (${candidate})`);
          return dl;
        }
        if (dl?.images?.length) {
          console.log(`[KING MD tiktok] Knight OK slideshow (${candidate}) images=${dl.images.length}`);
          return dl;
        }
      } catch (err) {
        errors.push(`Knight: ${err?.message || err}`);
        console.log(`[KING MD tiktok] Knight failed:`, err?.message || err);
      }
    }
  } else {
    console.log('[KING MD tiktok] lib/api missing, skipping Knight, using ttdl only');
  }

  // 2. Try ruhend ttdl
  for (const candidate of tikTokUrlVariants(url)) {
    try {
      const dl = await scraperTikTokDownload(candidate);
      if (dl?.download) {
        console.log(`[KING MD tiktok] ttdl OK (${candidate})`);
        return dl;
      }
    } catch (err) {
      errors.push(`ttdl: ${err?.message || err}`);
      console.log(`[KING MD tiktok] ttdl failed:`, err?.message || err);
    }
  }

  throw new Error(errors[0] || 'All TikTok sources failed');
}

// ===== COMMAND - FOR OUR REAL main.js 👑 =====
// main.js calls: handler(sock, message, { text, args, from, channel, website, config, axios })
async function tiktokCommand(sock, message, extra = {}) {
  const from = extra.from || message.key.remoteJid;
  const args = extra.args || [];
  const axios = extra.axios || axiosLib;

  try {
    if (processedMessages.has(message.key.id)) return;
    processedMessages.add(message.key.id);
    setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

    // FIXED: Get URL from args OR extra.text OR message text - not just conversation
    const fullText = args.join(' ') || extra.text || message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || '';
    const url = extractUrl(fullText);

    if (!url) {
      return sock.sendMessage(from, { text: `*KING MD TIKTOK* 👑\n\nPlease provide a TikTok link.\nExample: \`.tiktok https://vm.tiktok.com/...\`` }, { quoted: message });
    }
    if (!TT_PATTERNS.some((p) => p.test(url))) {
      return sock.sendMessage(from, { text: '❌ That is not a valid TikTok link.' }, { quoted: message });
    }

    await sock.sendMessage(from, { react: { text: '🔄', key: message.key } }).catch(() => {});

    const dl = await resolveTikTok(url);
    let video;

    if (dl.images?.length && !dl.download) {
      if (waVideoLib?.slideshowToWhatsAppVideo) {
        video = await waVideoLib.slideshowToWhatsAppVideo(dl.images, dl.audio || null, TT_HEADERS);
      } else {
        // No slideshow lib - send first image + audio note
        await sock.sendMessage(from, { image: { url: dl.images[0] }, caption: captionFor(dl.title, extra) }, { quoted: message });
        return;
      }
    } else if (dl.download) {
      video = await fetchVideoBuffer(dl.download, axios);
    } else {
      throw new Error('Invalid download response');
    }

    await sock.sendMessage(from, { video, mimetype: 'video/mp4', caption: captionFor(dl.title, extra) }, { quoted: message });
    await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});

  } catch (err) {
    console.error('[KING MD tiktok]', err?.message || err);
    await sock.sendMessage(from, { text: '❌ *KING MD* 👑\n\nFailed to download TikTok video. Try again with a different link.' }, { quoted: message }).catch(() => {});
  }
}

// ===== EXPORT LIKE main.js EXPECTS =====
tiktokCommand.execute = tiktokCommand;
tiktokCommand.handler = tiktokCommand;
tiktokCommand.run = tiktokCommand;
tiktokCommand.name = 'tiktok';
tiktokCommand.description = 'Download TikTok video';
tiktokCommand.category = 'download';

module.exports = tiktokCommand;
