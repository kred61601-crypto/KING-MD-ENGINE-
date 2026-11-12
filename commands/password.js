const fs = require('fs');
const path = require('path');

const PASSWORDS_FILE = path.join(__dirname, '..', 'manage-passwords.json');

function loadPasswords() {
  try {
    return JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function savePasswords(data) {
  fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(data, null, 2));
}

function normalizePhone(p) {
  let s = String(p || '').replace(/\D/g, '');
  if (s.startsWith('0')) s = '254' + s.slice(1);
  return s;
}

async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
  } catch (_) {}
}

module.exports = {
  name: 'password',
  alias: ['pass', 'botpassword', 'managepassword'],
  desc: 'Show or change Manage Bot password',
  category: 'owner',
  async execute(sock, msg, args) {
    await react(sock, msg, '🔐');

    const from = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid || '').replace(/@.*/, '');
    const botNumber = normalizePhone(sock.user?.id?.split(':')[0] || '');
    const isOwner = msg.key.fromMe || sender === botNumber;

    if (!isOwner) {
      await sock.sendMessage(from, { text: 'Only bot owner can use this command.' }, { quoted: msg });
      await react(sock, msg, '❌');
      return;
    }

    const passwords = loadPasswords();
    const current = passwords[botNumber]?.password || passwords[botNumber] || '';
    const newPass = String(args[0] || '').trim();

    if (!newPass) {
      if (!current) {
        await sock.sendMessage(from, { text: 'No Manage Bot password set yet for this bot.' }, { quoted: msg });
        await react(sock, msg, '❌');
        return;
      }
      await sock.sendMessage(from, {
        text: `*Manage Bot Password*\n\nBot: +${botNumber}\nPassword: ${current}\n\nUse it in App > Manage Bot to login.\nChange it with: .password <newpassword>`
      }, { quoted: msg });
      await react(sock, msg, '✅');
      return;
    }

    if (newPass.length < 6) {
      await sock.sendMessage(from, { text: 'Password must be at least 6 characters.' }, { quoted: msg });
      await react(sock, msg, '❌');
      return;
    }

    passwords[botNumber] = {
      password: newPass,
      updatedAt: new Date().toISOString()
    };
    savePasswords(passwords);

    await sock.sendMessage(from, {
      text: `*Manage Bot Password Updated*\n\nBot: +${botNumber}\nNew Password: ${newPass}\n\nUse it in App > Manage Bot to login.`
    }, { quoted: msg });
    await react(sock, msg, '✅');
  }
};
