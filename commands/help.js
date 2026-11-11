// KING MD V4 - help.js - YOUR DESIGN + VIEW CHANNEL BUTTON 👑
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, message) {
    const from = message.key.remoteJid;
    
    const ownerName = "KING";
    const version = "4.0.0";
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    const runtime = `${h}h ${m}m ${s}s`;
    const time = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const ping = Math.floor(Math.random() * 30) + 10;

    // This makes "... Read more" like in your screenshot
    const readMore = '\u200b'.repeat(4000);

    const menuText = `╔═════════◇◆◇═════════╗
├▢ *𝗡𝗔𝗠𝗘: 🌐 𝗞𝗜𝗡𝗚 𝗠𝗗 ❤️‍🔥*
├▢ *𝗢𝗪𝗡𝗘𝗥: ${ownerName}*
├▢ *𝗧𝗜𝗠𝗘: ${time}*
├▢ *𝗥𝗨𝗡𝗧𝗜𝗠𝗘: ${runtime}*
├▢ *𝗣𝗜𝗡𝗚: ${ping} ms*
├▢ *𝗩𝗘𝗥𝗦𝗜𝗢𝗡: v${version}*
╚═════════◇◆◇═════════╝

┏❐═══════════════════╗
┃     𝗢𝗧𝗛𝗘𝗥 𝗠𝗘𝗡𝗨 🔮
╠────────────────────╣
┃├▢ .menu
┃├▢ .ping
┃├▢ .alive
┃├▢ .tts
┃├▢ .owner
┃├▢ .joke
┃├▢ .quote
┃├▢ .fact
┃├▢ .weather 
┃├▢ .news
┃├▢ .attp
┃├▢ .lyrics
┃├▢ .8ball 
┃├▢ .groupinfo
┃├▢ .admins 
┃├▢ .vv
┃├▢ .trt
┃├▢ .ss 
┃├▢ .jid
┃├▢ .runtime 
┃├▢ .uptime 
┃├▢ .staff 
┃├▢ .qrcode *[NEW]*
┃├▢ .shorturl *[NEW]*
┃├▢ .translate *[NEW]*
┗❐═══════════════════╝

┏❐═══════════════════╗
┃       𝗔𝗜 𝗠𝗘𝗡𝗨 🤖
╠────────────────────╣
┃├▢ .gpt
┃├▢ .gemini
┃├▢ .imagine
┃├▢ .flux
┃├▢ .dalle 
┗❐═══════════════════╝

┏❐═══════════════════╗
┃       𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦 ⚙️
╠────────────────────╣
┃├▢ .mode
┃├▢ .autostatus
┃├▢ .clearsession
┃├▢ .antidelete
┃├▢ .cleartmp
┃├▢ .setpp 
┃├▢ .autoreact
┃├▢ .areact *[NEW]*
┃├▢ .setbotbio *[NEW]*
┃├▢ .autotyping *[NEW]*
┃├▢ .autorecording *[NEW]*
┃├▢ .anticall *[NEW]*
┃├▢ .pmpermit *[NEW]*
┃├▢ .pmapprove *[NEW]*
┃├▢ .pmblock *[NEW]*
┃├▢ .channelreact *[NEW]*
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗚𝗥𝗢𝗨𝗣 𝗠𝗘𝗡𝗨 👬
╠────────────────────╣
┃├▢ .ban
┃├▢ .unban
┃├▢ .promote
┃├▢ .demote
┃├▢ .mute 
┃├▢ .unmute
┃├▢ .delete
┃├▢ .kick
┃├▢ .warnings
┃├▢ .warn
┃├▢ .antilink
┃├▢ .antibadword
┃├▢ .clear
┃├▢ .tag
┃├▢ .tagall
┃├▢ .chatbot
┃├▢ .resetlink
┃├▢ .welcome
┃├▢ .goodbye
┃├▢ .kickall *[NEW]*
┃├▢ .leavegc *[NEW]*
┃├▢ .add *[NEW]*
┃├▢ .setname *[NEW]*
┃├▢ .setdesc *[NEW]*
┃├▢ .revoke *[NEW]*
┃├▢ .hidetag *[NEW]*
┃├▢ .tagadmins *[NEW]*
┃├▢ .creategc *[NEW]*
┃├▢ .online *[NEW]*
┃├▢ .onlineusers *[NEW]*
┃├▢ .onlineadmins *[NEW]*
┃├▢ .onlinestats *[NEW]*
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗦𝗧𝗜𝗖𝗞𝗘𝗥 𝗠𝗘𝗡𝗨 ❤️‍🔥
╠────────────────────╣
┃├▢ .blur
┃├▢ .simage 
┃├▢ .sticker
┃├▢ .tgsticker
┃├▢ .meme
┃├▢ .take 
┃├▢ .emojimix
┃├▢ .s
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗙𝗨𝗡 𝗠𝗘𝗡𝗨 😅
╠────────────────────╣
┃├▢ .tictactoe 
┃├▢ .hangman
┃├▢ .guess 
┃├▢ .trivia
┃├▢ .answer
┃├▢ .truth
┃├▢ .dare
┃├▢ .ttt *[NEW]* 
┃├▢ .move *[NEW]* 
┃├▢ .surrender *[NEW]* 
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗘𝗫𝗧𝗥𝗔 𝗠𝗘𝗡𝗨 🛠
╠────────────────────╣
┃├▢ .compliment
┃├▢ .insult
┃├▢ .flirt 
┃├▢ .shayari
┃├▢ .goodnight
┃├▢ .roseday
┃├▢ .character
┃├▢ .wasted
┃├▢ .ship 
┃├▢ .simp
┃├▢ .stupid
┃├▢ .waste 
┃├▢ .gn *[NEW]* 
┃├▢ .lovenight *[NEW]* 
┃├▢ .shayri *[NEW]*
┃├▢ .itssostupid *[NEW]* 
┃├▢ .iss *[NEW]*
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗗𝗘𝗦𝗜𝗚𝗡 𝗠𝗘𝗡𝗨 🔱
╠────────────────────╣
┃├▢ .metallic 
┃├▢ .ice 
┃├▢ .snow
┃├▢ .impressive
┃├▢ .matrix
┃├▢ .light
┃├▢ .neon
┃├▢ .devil
┃├▢ .purple
┃├▢ .thunder
┃├▢ .leaves
┃├▢ .1917 
┃├▢ .arena
┃├▢ .hacker
┃├▢ .sand
┃├▢ .blackpink
┃├▢ .glitch
┃├▢ .fire 
┗❐═══════════════════╝

┏❐═══════════════════╗
┃   𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 𝗠𝗘𝗡𝗨 📥
╠────────────────────╣
┃├▢ .play
┃├▢ .song 
┃├▢ .instagram
┃├▢ .facebook
┃├▢ .tiktok 
┃├▢ .video
┃├▢ .ytmp4
┃├▢ .music *[NEW]*
┃├▢ .mp3 *[NEW]* 
┃├▢ .ytmp3 *[NEW]* 
┃├▢ .yts *[NEW]* 
┃├▢ .insta *[NEW]* 
┃├▢ .ig *[NEW]* 
┃├▢ .fb *[NEW]* 
┃├▢ .tt *[NEW]* 
┗❐═══════════════════╝

┏❐═══════════════════╗
┃   𝗨𝗧𝗜𝗟𝗜𝗧𝗬 & 𝗧𝗢𝗢𝗟𝗦 🛠 
╠────────────────────╣
┃├▢ .save *[Status Saver] [NEW]*
┃├▢ .savecontact *[NEW]*
┃├▢ .vcf *[NEW]* 
┃├▢ .block *[NEW]*
┃├▢ .unblock *[NEW]*
┃├▢ .pair *[NEW]*
┃├▢ .linkdevice *[NEW]* 
┃├▢ .screenshot *[NEW]*
┃├▢ .qr *[NEW]* 
┃├▢ .short *[NEW]* 
┃├▢ .del *[NEW]* 
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗚𝗜𝗧𝗛𝗨𝗕 𝗠𝗘𝗡𝗨 📜
╠────────────────────╣
┃├▢ .git
┃├▢ .github
┃├▢ .sc
┃├▢ .script
┃├▢ .repo
┃├▢ .gitclone
┗❐═══════════════════╝

┏❐═══════════════════╗
┃     𝗔𝗕𝗢𝗨𝗧 𝗨𝗦
╠────────────────────╣
┃  𝑚𝑢𝑙𝑡𝑖𝑑𝑒𝑣𝑖𝑐𝑒 𝑤ℎ𝑎𝑡𝑠𝑎𝑝𝑝 𝑏𝑜𝑡 ❤️‍🔥 
┃  𝐶𝑟𝑒𝑎𝑡𝑜𝑟: KING
┃  𝑌𝑜𝑢𝑡𝑢𝑏𝑒: @KING MD
┗❐═══════════════════╝${readMore}
> 👑 KING MD - Tap View Channel Below 👑`;

    // --- THIS IS THE VIEW CHANNEL BUTTON ---
    const channelContext = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120207367533840780@newsletter', // <-- PUT YOUR CHANNEL JID HERE
            newsletterName: 'KING MD 👑',
            serverMessageId: 1
        }
    };

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
            await sock.sendMessage(from, { 
                image: menuImage, 
                caption: menuText,
                contextInfo: channelContext
            });
        } else {
            await sock.sendMessage(from, { 
                text: menuText,
                contextInfo: channelContext
            });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: menuText });
    }
}

module.exports = helpCommand;
