'use strict';
// KING MD V4 - commands/play.js - FRESH for new main.js 👑
// main.js calls: handler(sock, msg, args, extra)
const axiosLib = require('axios');
const ytsLib = require('yt-search');

module.exports = {
  name: 'play',
  aliases: ['ply', 'playy', 'pl'],
  description: 'Search and download songs from YouTube',
  category: 'download',
  async execute(sock, msg, args, extra = {}) {
    const from = extra.from || msg.key.remoteJid;
    const ytSearch = extra.ytSearch || ytsLib;
    const axios = extra.axios || axiosLib;
    const channel = extra.channel || '';
    const website = extra.website || '';

    const reply = async (text) => {
      return sock.sendMessage(from, { text }, { quoted: msg });
    };

    const react = async (emoji) => {
      try {
        await sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
      } catch (_) {}
    };

    try {
      const query = (args || []).join(' ').trim() || (extra.text || '').replace(/^[.!]play\s+/i, '').trim();

      if (!query) {
        return reply(
          `🎧 *KING MD — AUDIO DOWNLOADER* 👑\n\n` +
          `Use: .play song name\n` +
          `Example: .play Nawaza by Diamond Platnumz\n\n` +
          `You can also send a YouTube link.\n\n` +
          `Channel: ${channel}\nWebsite: ${website}`
        );
      }

      await react('⏳');

      const search = await ytSearch(query);
      const video = search.videos?.[0];

      if (!video) {
        await react('❌');
        return reply('❌ No song found. Try another song title.');
      }

      const title = video.title || 'Unknown Song';
      const artist = video.author?.name || 'Unknown Artist';
      const duration = video.timestamp || 'Unknown';
      const views = Number(video.views || 0).toLocaleString();
      const videoUrl = video.url;
      const thumbnail = video.thumbnail;

      const caption =
        `• *KING MD AUDIO DOWNLOADER* 🎧👑\n` +
        `┏━━━⪼\n` +
        `┃ 🎵 *Title* - ${title}\n` +
        `┃ ⏱️ *Duration* - ${duration}\n` +
        `┃ 👁️ *Views* - ${views}\n` +
        `┃ 👤 *Author* - ${artist}\n` +
        `┃ 📥 *Status* - Downloading...\n` +
        `┗━━━⪼\n\n` +
        `Powered by *KING MD* 👑`;

      try {
        await sock.sendMessage(from, { image: { url: thumbnail }, caption }, { quoted: msg });
      } catch (_) {
        await reply(caption);
      }

      const api = 'https://apiziaul.vercel.app/api/downloader/ytplaymp3?query=' + encodeURIComponent(videoUrl);
      const response = await axios.get(api, { timeout: 60000, headers: { Accept: 'application/json' } });
      const data = response.data;

      const audioUrl =
        data?.result?.downloadUrl ||
        data?.result?.url ||
        data?.downloadUrl ||
        data?.url ||
        data?.result?.download?.url;

      if (!data?.status && !audioUrl) {
        await react('❌');
        return reply('❌ *KING MD*\n\nThe song was found, but the audio service did not provide a download link. Try again later.');
      }
      if (!audioUrl) {
        await react('❌');
        return reply('❌ *KING MD*\n\nNo download link from API. Try again later.');
      }

      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: 25 * 1024 * 1024,
        maxBodyLength: 25 * 1024 * 1024
      });

      const audio = Buffer.from(audioResponse.data);
      if (!audio.length) throw new Error('Audio download returned an empty file.');

      const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 100);

      await sock.sendMessage(from, {
        audio,
        mimetype: 'audio/mpeg',
        fileName: `${safeTitle}.mp3`
      }, { quoted: msg });

      await react('✅');

    } catch (error) {
      console.error('[KING MD PLAY ERROR]', error.response?.data || error.message || error);
      await react('❌');
      await reply('❌ *KING MD*\n\nSorry, the song could not be downloaded. The download service may be unavailable. Please try again.').catch(() => {});
    }
  }
};
