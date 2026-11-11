// KING MD V4 - commands/play.js - FIXED FOR REAL main.js 👑
// main.js calls: handler(sock, message, { text, args, from, channel, website, settings, config, ytSearch, axios, ytdl, ffmpeg, fetch })
const axiosLib = require('axios');
const ytsLib = require('yt-search');

async function playCommand(sock, message, extra = {}) {
    const from = extra.from || message.key.remoteJid;
    const args = extra.args || [];
    const ytSearch = extra.ytSearch || ytsLib;
    const axios = extra.axios || axiosLib;
    const channel = extra.channel || '';
    const website = extra.website || '';

    const reply = async (text) => {
        return sock.sendMessage(from, { text }, { quoted: message });
    };

    const react = async (emoji) => {
        try {
            await sock.sendMessage(from, { react: { text: emoji, key: message.key } });
        } catch {}
    };

    try {
        // args = ["Nawaza", "by", "Diamond"] -> query = "Nawaza by Diamond"
        // extra.text = ".play Nawaza..." -> strip command
        const query = args.join(' ').trim() || (extra.text || '').replace(/^[.!]play\s+/i, '').trim();

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

        // Search for the song
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
            await sock.sendMessage(from, { image: { url: thumbnail }, caption }, { quoted: message });
        } catch {
            await reply(caption);
        }

        // Request audio download
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

        // Download audio
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
        }, { quoted: message });

        await react('✅');

    } catch (error) {
        console.error('[KING MD PLAY ERROR]', error.response?.data || error.message || error);
        await react('❌');
        await reply('❌ *KING MD*\n\nSorry, the song could not be downloaded. The download service may be unavailable. Please try again.').catch(() => {});
    }
}

// ===== EXPORT LIKE main.js EXPECTS =====
// main.js resolveCommandHandler: if typeof mod === 'function' return mod
// So export function directly, + also .execute for old style
playCommand.execute = playCommand;
playCommand.handler = playCommand;
playCommand.run = playCommand;
playCommand.name = 'play';
playCommand.aliases = ['ply', 'playy', 'pl'];
playCommand.description = 'Search and download songs from YouTube';
playCommand.category = 'download';

module.exports = playCommand;
