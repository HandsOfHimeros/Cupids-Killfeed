const { Client, Intents } = require('discord.js');

const bot = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES
    ] 
});

bot.once('ready', async () => {
    console.log('✅ Bot logged in as', bot.user.tag);
    
    try {
        const guild = await bot.guilds.fetch('1386432422744162476');
        console.log(`\n📋 Channels in ${guild.name}:\n`);
        
        const channels = await guild.channels.fetch();
        channels.forEach(channel => {
            if (channel && channel.type === 'GUILD_TEXT') {
                const name = channel.name.toLowerCase();
                if (name.includes('connect') || name.includes('join') || name.includes('player')) {
                    console.log(`🔍 ${channel.name} - ID: ${channel.id}`);
                }
            }
        });
        
        console.log('\n\n📋 ALL TEXT CHANNELS:');
        channels.forEach(channel => {
            if (channel && channel.type === 'GUILD_TEXT') {
                console.log(`${channel.name} - ${channel.id}`);
            }
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
});

bot.login(process.env.TOKEN);
