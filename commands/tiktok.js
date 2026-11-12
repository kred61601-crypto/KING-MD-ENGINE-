'use strict';
const axiosDefault = require('axios');
const fetchDefault = require('node-fetch');
const seen = new Set();
const UA = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

function extractTikTokUrl(input) {
  const match = String(input || '').match(/https?:\/\/[^\s<>]+/i);
  if (!match) return '';
  const candidate = match[0].replace(/[),.!?\]}]+$/g, '');
  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return parsed.toString();
    return '';
  } catch { return ''; }
}

async function resolveUrl(url, axios, fetch) {
  try {
    const response = await axios.get(url, { maxRedirects: 8, timeout: 20000, headers: { 'User-Agent': UA }, validateStatus: s => s >= 200 && s < 400 });
    const finalUrl = response.request?.res?.responseUrl || response.request?._redirectable?._currentUrl || response.config?.url || url;
    return String(finalUrl).startsWith('http') ? finalUrl : url;
  } catch (_) {
    try { const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA }, timeout: 20000 }); return response.url || url; }
    catch { return url; }
  }
}

function normalizeTikwm(json) {
  const d = json?.data || json?.result || json;
  if (!d || typeof d !== 'object') return null;
  const video = d.hdplay || d.play || d.wmplay || d.video?.noWatermark || d.video?.url || d.download || d.url;
  const images = d.images || d.image_post_info?.images?.map(x => x?.display_image?.url_list?.[0]).filter(Boolean);
  if (Array.isArray(images) && images.length) return { title: d.title || 'TikTok photo post', images, audio: d.music || d.music_info?.play };
  if (typeof video === 'string' && /^https?:\/\//i.test(video)) return { title: d.title || 'TikTok video', video };
  return null;
}

async function getDownload(url, axios) {
  const errors = [];
  const endpoints = [
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://apiziaul.vercel.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, { timeout: 45000, headers: { 'User-Agent': UA, Accept: 'application/json' } });
      const normalized = normalizeTikwm(response.data);
      if (normalized) return normalized;
      errors.push(`No media returned by ${new URL(endpoint).hostname}`);
    } catch (error) { errors.push(`${new URL(endpoint).hostname}: ${error.message}`); }
  }
  throw new Error(errors.join('; ').slice(0, 350) || 'TikTok download services did not return a video');
}

async function handler(sock, message, extra = {}) {
  const chat = extra.from || message.key.remoteJid;
  const axios = extra.axios || axiosDefault;
  const fetch = extra.fetch || fetchDefault;
  const argsText = (extra.args || []).join(' ') || extra.text || message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  const url = extractTikTokUrl(argsText);
  if (!url) return sock.sendMessage(chat, { text: '📥 *KING MD TIKTOK DOWNLOADER*\nSend a valid TikTok video link.\nExample: .tiktok https://www.tiktok.com/@user/video/123456789' }, { quoted: message });
  const id = message.key?.id;
  if (id && seen.has(id)) return;
  if (id) { seen.add(id); setTimeout(() => seen.delete(id), 3 * 60 * 1000); }
  try {
    await sock.sendMessage(chat, { react: { text: '⏳', key: message.key } }).catch(() => {});
    const resolved = await resolveUrl(url, axios, fetch);
    const result = await getDownload(resolved, axios);
    const caption = `👑 *DOWNLOADED BY ${String(extra.config?.botName || 'KING MD').toUpperCase()}*\n${result.title || ''}`.trim();
    if (result.images?.length) {
      for (const imageUrl of result.images.slice(0, 8)) await sock.sendMessage(chat, { image: { url: imageUrl }, caption }, { quoted: message });
      if (result.audio) await sock.sendMessage(chat, { audio: { url: result.audio }, mimetype: 'audio/mpeg', fileName: 'tiktok-audio.mp3' }, { quoted: message });
    } else {
      const response = await axios.get(result.video, { responseType: 'arraybuffer', timeout: 90000, maxContentLength: 70 * 1024 * 1024, maxBodyLength: 70 * 1024 * 1024, headers: { 'User-Agent': UA, Referer: 'https://www.tiktok.com/' } });
      const buffer = Buffer.from(response.data);
      if (!buffer.length) throw new Error('The download service returned an empty file');
      if (buffer.length > 70 * 1024 * 1024) throw new Error('Video is too large (70 MB limit)');
      const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('application/json')) throw new Error('Download service returned a webpage instead of a video');
      await sock.sendMessage(chat, { video: buffer, mimetype: 'video/mp4', caption }, { quoted: message });
    }
    await sock.sendMessage(chat, { react: { text: '✅', key: message.key } }).catch(() => {});
  } catch (error) {
    console.error('[KING MD TikTok]', error.stack || error.message);
    await sock.sendMessage(chat, { text: `❌ *TikTok download failed*\n${String(error.message || 'Downloader unavailable').slice(0, 300)}\n\nTry a public TikTok video link again later.` }, { quoted: message }).catch(() => {});
    await sock.sendMessage(chat, { react: { text: '❌', key: message.key } }).catch(() => {});
  }
}
handler.execute = handler; handler.handler = handler; handler.run = handler;
handler.name = 'tiktok'; handler.description = 'Download public TikTok videos and photo posts'; handler.category = 'download';
module.exports = handler;
