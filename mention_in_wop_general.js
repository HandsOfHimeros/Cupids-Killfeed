// Script to mention a user in wop-general
const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const guildId = config.GUILDID; // Use main guild from config
const channelName = 'wop-general';
const userId = '1385045856612519967';
const message = `<@${userId}> hey mods, can the bot just ban people for fun? Asking for a friend. 😇`;

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.find(ch => ch.name === channelName && ch.type === 'GUILD_TEXT');
        if (channel) {
            await channel.send(message);
            console.log(`Message sent to ${channel.name}`);
        } else {
            console.log(`Channel '${channelName}' not found in guild ${guild.name}`);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
    process.exit(0);
});

client.login(config.TOKEN);
