const Discord = require('discord.js');
const db = require('./database.js');
require('dotenv').config();

const guildId = '1386432422744162476';

const bot = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES
    ]
});

async function listChannels() {
    try {
        await bot.login(process.env.TOKEN);
        
        console.log('Bot logged in, fetching guild...');
        
        const guild = await bot.guilds.fetch(guildId);
        console.log(`\n=== Channels in ${guild.name} ===\n`);
        
        const textChannels = guild.channels.cache.filter(ch => ch.type === 'GUILD_TEXT');
        
        textChannels.forEach(channel => {
            console.log(`${channel.name} - ID: ${channel.id}`);
        });
        
        console.log('\n\nWhich channels do you want to use?');
        console.log('I need:');
        console.log('1. Killfeed Channel (for kills, hits, suicides, builds)');
        console.log('2. Connections Channel (for player connects/disconnects)');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listChannels();
