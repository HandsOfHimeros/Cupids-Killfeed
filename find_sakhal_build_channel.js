const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const bot = new Client({ 
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] 
});

bot.once('ready', async () => {
    console.log('Bot ready, checking Sakhal build channel...\n');
    
    const sakhalGuildId = '1445957198000820316'; // Sakhal server
    
    try {
        const guild = await bot.guilds.fetch(sakhalGuildId);
        console.log(`✅ Found guild: ${guild.name}`);
        
        // Search for build channel
        const channels = await guild.channels.fetch();
        const buildChannel = channels.find(ch => ch.name.includes('build'));
        
        if (buildChannel) {
            console.log(`✅ Build channel found: ${buildChannel.name} (ID: ${buildChannel.id})`);
        } else {
            console.log('❌ No build channel found in Sakhal server!');
            console.log('\nAll channels:');
            channels.forEach(ch => console.log(`  - ${ch.name} (${ch.type})`));
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
    
    process.exit(0);
});

bot.login(config.TOKEN);
