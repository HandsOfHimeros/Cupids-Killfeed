const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const guildId = '1385045856612519967'; // Target guild
const channelName = 'wop-general';
const message = `Hey mods, quick question: can the bot just ban people for fun? Asking for a friend. 😇`;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.find(ch => ch.name === channelName && ch.type === 'GUILD_TEXT');
        if (channel) {
            await channel.send(message);
            console.log(`Message sent to ${guild.name} (${channel.name})`);
        } else {
            console.log(`Channel '${channelName}' not found in guild ${guild.name}`);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
    process.exit(0);
});

client.login(config.TOKEN);
