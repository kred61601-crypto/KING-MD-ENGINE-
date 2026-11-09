const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363317747980810@newsletter',
            newsletterName: '𝐄𝐌𝐌𝐘𝐇𝐄𝐍𝐙-𝐕1',
            serverMessageId: -1
        }
    }
};

// Path to store bot bio configuration
const configPath = path.join(__dirname, '../data/botbio.json');

// Default bio for all deployed bots
const DEFAULT_BIO = '𝐄𝐌𝐌𝐘 𝐇𝐄𝐍𝐙 𝐕1 𝐢𝐬 𝐚𝐜𝐭𝐢𝐯𝐞 ❤️‍🔥';

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        currentBio: DEFAULT_BIO,
        isDefault: true 
    }));
}

async function setbotbioCommand(sock, chatId, msg, args) {
    try {
        // Check if sender is owner
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ 𝐓𝐡𝐢𝐬 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐂𝐚𝐧 𝐁𝐞 𝐔𝐬𝐞𝐝 𝐎𝐧𝐥𝐲 𝐁𝐲 𝐌𝐲 𝐎𝐰𝐧𝐞𝐫 𝐎𝐧𝐥𝐲!',
                ...channelInfo
            });
            return;
        }

        // Read current config
        let config = JSON.parse(fs.readFileSync(configPath));

        // Get bio text from arguments
        const bioText = args.join(' ').trim();

        // If no arguments, show current bio and usage
        if (!bioText) {
            await sock.sendMessage(chatId, { 
                text: `📝 *𝐁𝐎𝐓 𝐁𝐈𝐎 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*\n\nCurrent bio: ${config.currentBio}\nStatus: ${config.isDefault ? 'Default' : 'Custom'}\n\nWhere's the bio text?\n*Example:* .setbotbio 𝐄𝐌𝐌𝐘 𝐇𝐄𝐍𝐙 𝐕1 𝐢𝐬 𝐚𝐜𝐭𝐢𝐯𝐞 ❤️‍🔥\n\nTo reset to default bio, use:\n.setbotbio default`,
                ...channelInfo
            });
            return;
        }

        let newBio;
        let isDefault = false;

        // Check if user wants to reset to default
        if (bioText.toLowerCase() === 'default') {
            newBio = DEFAULT_BIO;
            isDefault = true;
        } else {
            newBio = bioText;
            isDefault = false;
        }

        try {
            // Update the bot's profile status
            await sock.updateProfileStatus(newBio);

            // Save the new bio to config
            config.currentBio = newBio;
            config.isDefault = isDefault;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Send success message
            const statusText = isDefault ? 'default bio' : 'custom bio';
            await sock.sendMessage(chatId, { 
                text: `✅ *Success in changing the bio of bot's number*\n\nNew bio: ${newBio}\nStatus: ${statusText}`,
                ...channelInfo
            });

        } catch (updateError) {
            console.error('Error updating profile status:', updateError);
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to update bot bio. Please try again later.\n\nError: ' + updateError.message,
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in setbotbio command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error occurred while setting bot bio!\n' + error.message,
            ...channelInfo
        });
    }
}

// Function to get current bio
function getCurrentBio() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.currentBio || DEFAULT_BIO;
    } catch (error) {
        console.error('Error reading bio config:', error);
        return DEFAULT_BIO;
    }
}

// Function to set default bio on bot startup
async function setDefaultBioOnStartup(sock) {
    try {
        let config;
        try {
            config = JSON.parse(fs.readFileSync(configPath));
        } catch (error) {
            // Create config if it doesn't exist
            config = { 
                currentBio: DEFAULT_BIO,
                isDefault: true 
            };
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }

        // Set default bio if it's not already set or if it's marked as default
        if (config.isDefault || !config.currentBio) {
            await sock.updateProfileStatus(DEFAULT_BIO);
            config.currentBio = DEFAULT_BIO;
            config.isDefault = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`✅ Bot bio set to default: ${DEFAULT_BIO}`);
        } else {
            console.log(`📝 Bot bio maintained: ${config.currentBio}`);
        }

    } catch (error) {
        console.error('❌ Error setting default bio on startup:', error.message);
    }
}

module.exports = {
    setbotbioCommand,
    getCurrentBio,
    setDefaultBioOnStartup,
    DEFAULT_BIO
};