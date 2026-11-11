// KING MD V4 - help.js - PERFECT STYLE 👑💎
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, message) {
    const from = message.key.remoteJid;
    const uptime = Math.floor(process.uptime());
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;

    const menuText = `╔════════════════════════╗
║                        ║
║   👑 𝕂𝕀ℕ𝔾 𝕄𝔻 𝕍𝟜 👑   ║
║                        ║
║   ⚡ 𝙋𝙍𝙀𝙈𝙄𝙐𝙈 𝘽𝙊𝙏 ⚡   ║
║                        ║
╚════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━┓
┃  👑 *OWNER :* KING
┃  🤖 *BOT :* KING MD V4
┃  📦 *VERSION :* 4.0.0
┃  🕐 *UPTIME :* ${h}h ${m}m ${s}s
┃  🌍 *MODE :* Public
┃  ⚡ *PING :* Fast
┗━━━━━━━━━━━━━━━━━━━━━┛

*╭───〔 ⚡ GENERAL 〕───╮*
*│*
*│  ✦ .ping*
*│  ✦ .alive*
*│  ✦ .menu*
*│  ✦ .owner*
*│  ✦ .help*
*│*
*╰──────────────────╯*

*╭───〔 👮 GROUP 〕───╮*
*│*
*│  ✦ .tagall*
*│  ✦ .kick*
*│  ✦ .ban / .unban*
*│  ✦ .promote / .demote*
*│  ✦ .mute / .unmute*
*│  ✦ .warn*
*│  ✦ .antilink*
*│  ✦ .antibadword*
*│  ✦ .groupinfo*
*│  ✦ .welcome / .goodbye*
*│*
*╰──────────────────╯*

*╭───〔 🎮 FUN 〕───╮*
*│*
*│  ✦ .joke*
*│  ✦ .meme*
*│  ✦ .quote*
*│  ✦ .fact*
*│  ✦ .ship 💘*
*│  ✦ .flirt*
*│  ✦ .truth / .dare*
*│  ✦ .eightball*
*│  ✦ .hangman*
*│  ✦ .trivia*
*│  ✦ .tictactoe*
*│*
*╰──────────────────╯*

*╭───〔 📥 DOWNLOAD 〕───╮*
*│*
*│  ✦ .play 🎵*
*│  ✦ .song*
*│  ✦ .video*
*│  ✦ .tiktok*
*│  ✦ .instagram*
*│  ✦ .facebook*
*│  ✦ .lyrics*
*│*
*╰──────────────────╯*

*╭───〔 🤖 AI & TOOLS 〕───╮*
*│*
*│  ✦ .ai*
*│  ✦ .imagine 🎨*
*│  ✦ .translate*
*│  ✦ .tts*
*│  ✦ .weather*
*│  ✦ .news*
*│  ✦ .ss*
*│  ✦ .github*
*│*
*╰──────────────────╯*

*╭───〔 📸 MEDIA 〕───╮*
*│*
*│  ✦ .sticker*
*│  ✦ .simage*
*│  ✦ .attp*
*│  ✦ .textmaker*
*│  ✦ .wasted*
*│  ✦ .setpp*
*│  ✦ .setbotbio*
*│*
*╰──────────────────╯*

*╭───〔 👑 OWNER 〕───╮*
*│*
*│  ✦ .autostatus*
*│  ✦ .autotyping*
*│  ✦ .antidelete*
*│  ✦ .anticall*
*│  ✦ .block*
*│  ✦ .creategc*
*│*
*╰──────────────────╯*

╔════════════════════════╗
║  📢 *CHANNEL*  ║
║  https://whatsapp.com/channel/0029Vb9AwScF6sn47ClubG1Z  ║
╚════════════════════════╝

*👑 𝕂𝕀ℕ𝔾 𝕄𝔻 𝕍𝟜 — 𝙍𝙐𝙇𝙀𝙎 𝙏𝙃𝙀 𝙂𝘼𝙈𝙀 👑*`;

    const menuPaths = [
        path.join(__dirname, '..', 'assets', 'menu.jpg'),
        path.join(__dirname, '..', 'assets', 'menu.png'),
        path.join(__dirname, '..', 'assets', 'menu.jpeg'),
    ];

    let menuImage = null;
    for (const p of menuPaths) {
        if (fs.existsSync(p)) { menuImage = fs.readFileSync(p); break; }
    }

    try {
        if (menuImage) {
            await sock.sendMessage(from, { image: menuImage, caption: menuText });
        } else {
            let ppUrl = null;
            try { ppUrl = await sock.profilePictureUrl(sock.user.id, 'image'); } catch (e) {}
            if (ppUrl) await sock.sendMessage(from, { image: { url: ppUrl }, caption: menuText });
            else await sock.sendMessage(from, { text: menuText });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: menuText });
    }
}

module.exports = helpCommand;
