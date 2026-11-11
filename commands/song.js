// KING MD V4 - song.js - FIXED 👑🎵
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

let toAudio = null;
let APIs = {};
try { toAudio = require('../lib/converter').toAudio; } catch (e) { console.log('[song] converter not found, will send original format'); }
try { APIs = require('../lib/api'); } catch (e) { console.log('[song] lib/api not found, using direct APIs'); }

const UA = APIs.UA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function isIpLockedCdn(url){
    if (APIs.isIpLockedCdn) return APIs.isIpLockedCdn(url);
    return false;
}

function extractYouTubeId(input) {
  const text = String(input || '').trim();
  const m =
    text.match(/(?:youtube\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i) ||
    text.match(/^([a-zA-Z0-9_-]{11})$/);
  return m?.[1] || null;
}

async function resolveVideoInfo(text) {
  // If link
  if (/youtube\.com|youtu\.be/i.test(text)) {
    const videoId = extractYouTubeId(text);
    if (videoId) {
      try {
        // FIXED: yts needs search string, not {videoId}
        const search = await yts(`https://www.youtube.com/watch?v=${videoId}`);
        if (search?.videos?.length) {
            const v = search.videos.find(v=>v.videoId===videoId) || search.videos[0];
            return { url: v.url, title: v.title, thumbnail: v.thumbnail, timestamp: v.timestamp };
        }
      } catch(e){ console.log('[song] yts link lookup failed', e.message); }
      return { url: `https://www.youtube.com/watch?v=${videoId}`, title: 'YouTube Audio', thumbnail: null, timestamp: '—' };
    }
    return { url: text.trim(), title: 'YouTube Audio', thumbnail: null, timestamp: '—' };
  }
  // If search text
  const search = await yts(text);
  if (!search?.videos?.length) return null;
  const v = search.videos[0];
  return { url: v.url, title: v.title, thumbnail: v.thumbnail, timestamp: v.timestamp };
}

async function fetchAudioBuffer(audioUrl, headers, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        decompress: true,
        validateStatus: (s) => s >= 200 && s < 400,
        headers,
      });
      const buf = Buffer.from(res.data);
      if (buf.length > 1000) return buf;
      throw new Error('Empty audio buffer');
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status === 403 || status === 451) throw err;
      console.log(`[song] fetch ${attempt}/${attempts}:`, status || err.code || err.message);
      if (attempt < attempts) await sleep(1000 * attempt);
    }
  }
  throw lastError || new Error('Failed to fetch audio');
}

function detectAudioFormat(buf) {
  if (!buf || buf.length < 12) return { name: 'UNKNOWN', ext: 'mp3' };
  if (buf.toString('ascii', 4, 8) === 'ftyp') return { name: 'M4A/MP4', ext: 'm4a' };
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { name: 'MP3', ext: 'mp3' };
  if (buf.toString('ascii', 0, 4) === 'OggS') return { name: 'OGG/Opus', ext: 'ogg' };
  if (buf.toString('ascii', 0, 4) === 'RIFF') return { name: 'WAV', ext: 'wav' };
  if (buf.readUInt32BE(0) === 0x1a45dfa3) return { name: 'WebM', ext: 'webm' };
  return { name: 'UNKNOWN', ext: 'mp3' };
}

// --- DIRECT FALLBACK APIs (work even if lib/api is broken) ---
async function directApi1(url){
    // y2mate style / savetube
    try{
        const r = await axios.post('https://api.savetube.me/convert', { url }, { timeout: 30000, headers: { 'User-Agent': UA, 'Content-Type': 'application/json' } });
        const dl = r.data?.url || r.data?.downloadUrl || r.data?.data?.url;
        if(dl) return { download: dl };
    }catch(e){}
    return {};
}
async function directApi2(url){
    try{
        const r = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 30000 });
        const dl = r.data?.result?.download || r.data?.result?.url || r.data?.download;
        if(dl) return { download: dl };
    }catch(e){}
    return {};
}

async function songCommand(sock, chatId, message) {
  try {
    const raw = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const text = raw.replace(/^\.(?:play|song|mp3|ytmp3)\s*/i, '').trim();

    if (!text) {
      await sock.sendMessage(chatId, { text: '🎵 *Usage:* .song <song name or YouTube link>\nExample: .song Diamond Platnumz - Komasava' }, { quoted: message });
      return;
    }

    const video = await resolveVideoInfo(text);
    if (!video?.url) {
      await sock.sendMessage(chatId, { text: '❌ No results found. Try another name.' }, { quoted: message });
      return;
    }

    // --- YOUR CHANNEL VIEW BUTTON ---
    const channelInvite = '0029Vb9AwScF6sn47ClubG1Z';
    let channelJid = '120207367533840780@newsletter';
    try { const meta = await sock.newsletterMetadata('invite', channelInvite); if(meta?.id) channelJid = meta.id; } catch(e){}
    const channelContext = { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: channelJid, newsletterName: 'KING MD 👑', serverMessageId: 1 } };

    const caption = `╔═══════════◇◆◇══════════╗
       🌐 𝗞𝗜𝗡𝗚 𝗠𝗗 ❤️‍🔥
╠────────────────────────╣
║  🎵 *${video.title || 'YouTube Audio'}*
║  ⏱ *Duration:* ${video.timestamp || '—'}
║  📥 *Downloading... Please wait*
╚═══════════◇◆◇══════════╝`;

    if (video.thumbnail && /^https?:\/\//i.test(video.thumbnail)) {
      await sock.sendMessage(chatId, { image: { url: video.thumbnail }, caption, contextInfo: channelContext }, { quoted: message });
    } else {
      await sock.sendMessage(chatId, { text: caption, contextInfo: channelContext }, { quoted: message });
    }

    let audioData = {};
    let audioBuffer = null;

    const apiMethods = [];
    // Only add if exists in lib/api - FIXED: won't crash if missing
    if (APIs.knightSongDownload) apiMethods.push({ name: 'Knight API', method: () => APIs.knightSongDownload(video.url) });
    if (APIs.hectorSongDownload) apiMethods.push({ name: 'Hector', method: () => APIs.hectorSongDownload(video.url) });
    if (APIs.princeSongDownload) apiMethods.push({ name: 'Prince API', method: () => APIs.princeSongDownload(video.url) });
    if (APIs.prexzySongDownload) apiMethods.push({ name: 'Prexzy', method: () => APIs.prexzySongDownload(video.url) });
    if (APIs.getEliteProTechDownloadByUrl) apiMethods.push({ name: 'EliteProTech', method: () => APIs.getEliteProTechDownloadByUrl(video.url) });
    if (APIs.getYupraDownloadByUrl) apiMethods.push({ name: 'Yupra', method: () => APIs.getYupraDownloadByUrl(video.url) });
    if (APIs.getOkatsuDownloadByUrl) apiMethods.push({ name: 'Okatsu', method: () => APIs.getOkatsuDownloadByUrl(video.url) });
    if (APIs.getIzumiDownloadByUrl) apiMethods.push({ name: 'Izumi', method: () => APIs.getIzumiDownloadByUrl(video.url) });
    // Direct fallbacks always work
    apiMethods.push({ name: 'Direct-1', method: () => directApi1(video.url) });
    apiMethods.push({ name: 'Direct-2', method: () => directApi2(video.url) });

    for (const apiMethod of apiMethods) {
      try {
        audioData = await apiMethod.method();
        const audioUrl = audioData?.download || audioData?.audio || audioData?.downloadUrl || audioData?.dl || audioData?.url;
        if (!audioUrl) { console.log(`${apiMethod.name} no URL, next...`); continue; }
        if (isIpLockedCdn(audioUrl)) { console.log(`${apiMethod.name} IP-locked, next...`); continue; }

        const headers = { 'User-Agent': UA, Accept: '*/*', 'Accept-Encoding': 'identity' };
        if (audioData.referer) headers.Referer = audioData.referer;

        try {
          audioBuffer = await fetchAudioBuffer(audioUrl, headers);
          if (!audioBuffer?.length || audioBuffer.length < 1000) { audioBuffer = null; continue; }
          console.log(`[song] OK via ${apiMethod.name} (${audioBuffer.length} bytes)`);
          break;
        } catch (downloadErr) {
          console.log(`Download failed ${apiMethod.name}:`, downloadErr.response?.status || downloadErr.message);
        }
      } catch (apiErr) {
        console.log(`${apiMethod.name} API failed:`, apiErr.message);
      }
    }

    if (!audioBuffer?.length) {
      throw new Error('All download sources failed.');
    }

    const detected = detectAudioFormat(audioBuffer);
    let finalBuffer = audioBuffer;
    let finalExtension = detected.ext || 'mp3';
    let mimetype = 'audio/mpeg';
    if (detected.ext === 'm4a') mimetype = 'audio/mp4';
    if (detected.ext === 'ogg') mimetype = 'audio/ogg';

    // FIXED: If conversion fails, SEND ORIGINAL - don't throw!
    if (detected.ext !== 'mp3' && toAudio) {
      try {
        const converted = await toAudio(audioBuffer, detected.ext);
        if (converted?.length) { finalBuffer = converted; finalExtension = 'mp3'; mimetype = 'audio/mpeg'; }
      } catch (convErr) {
        console.log('[song] convert failed, sending original:', convErr.message);
        // keep original - still works in WhatsApp!
      }
    }

    const cleanTitle = (audioData.title || video.title || 'song').replace(/[^\w\s-]/g, '').trim().slice(0, 50) || 'song';

    await sock.sendMessage(chatId, {
        audio: finalBuffer,
        mimetype: mimetype,
        fileName: `${cleanTitle}.${finalExtension}`,
        ptt: false,
        contextInfo: channelContext
      }, { quoted: message }
    );

  } catch (err) {
    console.error('Song command error:', err);
    let errorMessage = '❌ Failed to download song. Try again or try another song.';
    if (err.message?.includes('All download sources failed')) {
      errorMessage = '❌ All download sources failed. YouTube blocked this song, try another one.';
    }
    await sock.sendMessage(chatId, { text: errorMessage }, { quoted: message });
  }
}

module.exports = songCommand;
