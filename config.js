require('dotenv').config();

global.APIs = {
    xteam: 'https://api.xteam.xyz',
    dzx: 'https://api.dhamzxploit.my.id',
    lol: 'https://api.lolhuman.xyz',
    violetics: 'https://violetics.pw',
    neoxr: 'https://api.neoxr.my.id',
    zenzapis: 'https://zenzapis.xyz',
    akuari: 'https://api.akuari.my.id',
    akuari2: 'https://apimu.my.id',
    nrtm: 'https://fg-nrtm.ddns.net',
    bg: 'http://bochil.ddns.net',
    fgmods: 'https://api-fgmods.ddns.net'
};

global.APIKeys = {
    'https://api.xteam.xyz': 'd90a9e986e18778b',
    'https://api.lolhuman.xyz': '85faf717d0545d14074659ad',
    'https://api.neoxr.my.id': 'yourkey',
    'https://violetics.pw': 'beta',
    'https://zenzapis.xyz': 'yourkey',
    'https://api-fgmods.ddns.net': 'fg-dylux'
};

module.exports = {
    WARN_COUNT: 3,
    APIs: global.APIs,
    APIKeys: global.APIKeys,

    // ===== KING MD V4 - YOUR INFO 👑 =====
    // Your number - NO + , NO spaces
    ownerNumbers: ["254726476468"],
    ownerNumber: "254726476468",
    phoneNumber: "254726476468", // For panel deploy - main.js reads this

    // Your bot name
    botName: "KING MD",
    ownerName: "KING",

    // Channel + Website - main.js reads from HERE, not hardcoded!
    channel: "https://whatsapp.com/channel/0029Vb9AwScF6sn47ClubG1Z",
    channelLink: "https://whatsapp.com/channel/0029Vb9AwScF6sn47ClubG1Z",
    channelInvite: "0029Vb9AwScF6sn47ClubG1Z",
    channelCode: "0029Vb9AwScF6sn47ClubG1Z",

    website: "https://king-md-v7.onrender.com/",
    // Pairing code style
    pairingPrefix: "KINGMD",

    // Prefix
    prefix: ".",
};
