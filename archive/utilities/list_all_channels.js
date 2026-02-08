const { Client, Intents } = require('discord.js');
const config = require('./config.json');

async function listAllChannels() {
    const bot = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES
        ]
    });

    await bot.login(config.TOKEN);

    await new Promise(resolve => {
        bot.once('ready', () => {
            console.log(`✅ Bot logged in as ${bot.user.tag}\n`);
            resolve();
        });
    });

    const guilds = [
        { id: '1386432422744162476', name: 'Chernarus' },
        { id: '1445943557020979274', name: 'Livonia' },
        { id: '1445957198000820316', name: 'Sakhal' }
    ];

    for (const guildInfo of guilds) {
        console.log(`\n=== ${guildInfo.name.toUpperCase()} ===`);
        console.log(`Guild ID: ${guildInfo.id}`);
        
        try {
            const guild = await bot.guilds.fetch(guildInfo.id);
            const channels = await guild.channels.fetch();
            
            const textChannels = channels
                .filter(c => c.type === 'GUILD_TEXT')
                .sort((a, b) => a.position - b.position);
            
            console.log('\n📝 Text Channels:');
            textChannels.forEach(channel => {
                const name = channel.name.toLowerCase();
                if (name.includes('kill') || name.includes('suicide') || name.includes('build') || 
                    name.includes('connect') || name.includes('log')) {
                    console.log(`  ✅ ${channel.name} - ID: ${channel.id}`);
                } else {
                    console.log(`     ${channel.name} - ID: ${channel.id}`);
                }
            });
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }

    process.exit(0);
}

listAllChannels().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
