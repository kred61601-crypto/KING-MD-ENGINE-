// KING MD V4 - ping.js - YOUR CHANNEL LINK 👑
async function pingCommand(sock, message) {
    const from = message.key.remoteJid;
    const start = Date.now();
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    const runtime = `${h}h ${m}m ${s}s`;

    // YOUR CHANNEL - AUTO CONVERT LINK TO JID
    const channelInvite = '0029Vb9AwScF6sn47ClubG1Z';
    let channelJid = '120207367533840780@newsletter';
    try {
        const meta = await sock.newsletterMetadata('invite', channelInvite);
        if (meta && meta.id) channelJid = meta.id;
    } catch (e) {}

    const channelContext = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: 'KING MD 👑',
            serverMessageId: 1
        }
    };

    const pingText = `╔═══════════◇◆◇══════════╗
       🌐 𝗞𝗜𝗡𝗚 𝗠𝗗 ❤️‍🔥
╠────────────────────────╣
║  🧿 *pong* ${Date.now() - start} ms
║  ⏳ *bot running for* :   ${runtime}
║  🛜.     *𝗞𝗜𝗡𝗚 𝗠𝗗*
╠────────────────────────╣
     
╠────────────────────────╣
   𝐺𝑒𝑡 𝑦𝑜𝑢𝑟 𝑓𝑟𝑒𝑒 𝑤ℎ𝑎𝑡𝑠𝑎𝑝𝑝 𝑏𝑜𝑡 𝑛𝑜𝑤👆
╚═══════════◇◆◇══════════╝`;

    await sock.sendMessage(from, { text: pingText, contextInfo: channelContext });
}
module.exports = pingCommand;
