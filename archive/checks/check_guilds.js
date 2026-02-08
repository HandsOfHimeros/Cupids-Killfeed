const db = require('./database.js');

async function checkGuilds() {
    try {
        const guilds = await db.getAllGuildConfigs();
        console.log('\n=== GUILDS IN DATABASE ===');
        console.log(`Total guilds: ${guilds.length}\n`);
        
        for (const guild of guilds) {
            console.log(`Guild ID: ${guild.guild_id}`);
            console.log(`  Service ID: ${guild.nitrado_service_id}`);
            console.log(`  Map: ${guild.map_name}`);
            console.log(`  Channels: ${JSON.stringify(guild.channels)}`);
            console.log('');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkGuilds();
