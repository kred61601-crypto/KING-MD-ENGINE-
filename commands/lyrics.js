// KING MD V4 - commands/lyrics.js - FIXED FOR REAL main.js 👑
// main.js calls: handler(sock, message, { text, args, from, channel, website, settings, config, fetch })
const fetchLib = require('node-fetch');

async function lyricsCommand(sock, message, extra = {}) {
    const from = extra.from || message.key.remoteJid;
    const args = extra.args || [];
    const fetch = extra.fetch || fetchLib;
    const channel = extra.channel || '';
    const website = extra.website || '';

    // args = ["Nawaza", "Diamond"] -> "Nawaza Diamond"
    // extra.text = ".lyrics Nawaza" -> strip command if args empty
    const songTitle = args.join(' ').trim() || (extra.text || '').replace(/^[.!]lyrics\s+/i, '').trim();

    if (!songTitle) {
        await sock.sendMessage(from, {
            text: `🔍 *KING MD LYRICS* 👑\n\nPlease enter the song name!\n\nUsage: *.lyrics <song name>*\nExample: *.lyrics Nawaza*\n\nChannel: ${channel}\nWebsite: ${website}`
        }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(from, { react: { text: '🔍', key: message.key } }).catch(() => {});

        const apiUrl = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(errText || `API status ${res.status}`);
        }

        const data = await res.json();
        const lyrics = data?.result?.lyrics || data?.lyrics || data?.result || null;

        if (!lyrics || typeof lyrics !== 'string') {
            await sock.sendMessage(from, {
                text: `❌ *KING MD* 👑\n\nSorry, I couldn't find any lyrics for "${songTitle}".\nTry with artist name: *.lyrics ${songTitle} Diamond*`
            }, { quoted: message });
            return;
        }

        const header = `🎵 *KING MD LYRICS* 👑\n\n*Song:* ${songTitle}\n\n`;
        const full = header + lyrics;

        // FIXED: Don't just cut at 4096 - split into chunks so user gets FULL lyrics!
        const maxChars = 4000;
        if (full.length <= maxChars) {
            await sock.sendMessage(from, { text: full }, { quoted: message });
        } else {
            // Split by lines, keep chunks under 4000
            const lines = full.split('\n');
            let chunk = '';
            let first = true;
            for (const line of lines) {
                if ((chunk + line + '\n').length > maxChars) {
                    await sock.sendMessage(from, { text: chunk }, { quoted: first ? message : undefined });
                    first = false;
                    chunk = line + '\n';
                } else {
                    chunk += line + '\n';
                }
            }
            if (chunk.trim()) {
                await sock.sendMessage(from, { text: chunk }, { quoted: first ? message : undefined });
            }
        }

        await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (error) {
        console.error('Error in lyrics command:', error.message || error);
        await sock.sendMessage(from, {
            text: `❌ *KING MD* 👑\n\nAn error occurred while fetching the lyrics for "${songTitle}".\nTry again later.`
        }, { quoted: message }).catch(() => {});
    }
}

// ===== EXPORT LIKE main.js EXPECTS =====
// main.js: if typeof mod === 'function' return mod
// So export function directly, not { lyricsCommand }
lyricsCommand.execute = lyricsCommand;
lyricsCommand.handler = lyricsCommand;
lyricsCommand.run = lyricsCommand;
lyricsCommand.lyricsCommand = lyricsCommand; // backwards compat for old code
lyricsCommand.name = 'lyrics';
lyricsCommand.description = 'Get song lyrics';
lyricsCommand.category = 'download';

module.exports = lyricsCommand;
