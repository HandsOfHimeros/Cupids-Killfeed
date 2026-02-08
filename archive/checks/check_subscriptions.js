const db = require('./database.js');

async function checkSubscriptions() {
    try {
        console.log('📋 Checking subscription status...\n');
        
        const guilds = await db.getAllGuildConfigs();
        console.log(`Total configured servers: ${guilds.length}\n`);
        
        for (const guild of guilds) {
            const subscription = await db.getSubscription(guild.guild_id);
            console.log(`Guild: ${guild.guild_id}`);
            console.log(`  Name: ${guild.guild_name || 'Unknown'}`);
            console.log(`  Map: ${guild.map_name}`);
            console.log(`  Tier: ${subscription?.plan_tier || 'NOT SET'}`);
            console.log(`  Status: ${subscription?.status || 'NOT SET'}`);
            console.log('');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSubscriptions();
