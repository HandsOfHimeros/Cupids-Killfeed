// Check World of Pantheon channel configuration
const db = require('./database');

async function checkChannels() {
    const guildId = '1386432422744162476'; // World of Pantheon
    const config = await db.getGuildConfig(guildId);
    
    console.log('World of Pantheon Configuration:');
    console.log('Guild ID:', config.guild_id);
    console.log('Killfeed Channel:', config.killfeed_channel_id);
    console.log('Connections Channel:', config.connections_channel_id);
    console.log('Build Channel:', config.build_channel_id);
    console.log('Suicide Channel:', config.suicide_channel_id);
    
    process.exit(0);
}

checkChannels().catch(console.error);
