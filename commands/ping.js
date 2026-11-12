'use strict';

async function getChannelJid(sock) {
  const fallback = '120207367533840780@newsletter';
  const invite = '0029Vb9AwScF6sn47ClubG1Z';
  try {
    const meta = await Promise.race([
      sock.newsletterMetadata('invite', invite),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
    ]);
    if (meta && meta.id) return meta.id;
  } catch (_) {}
  return fallback;
}

module.exports = {
  name: 'ping',
  alias: ['pong', 'speed'],
  desc: 'Check KING MD speed',
  category: 'general',
  async execute(sock, msg, args, extra = {}) {
    const from = msg.key.remoteJid;
    const start = Date.now();
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    const runtime = `${h}h ${m}m ${s}s`;

    const channelJid = await getChannelJid(sock);

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
};
