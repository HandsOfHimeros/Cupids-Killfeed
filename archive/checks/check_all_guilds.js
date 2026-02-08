const db = require('./database');

async function checkAllGuilds() {
    const guilds = [
        { id: '1386432422744162476', name: 'Original Server (World Of Pantheon)' },
        { id: '1445943557020979274', name: 'Eternal Frost' },
        { id: '1445957198000820316', name: 'Sakhal' }
    ];

    console.log('=== CHECKING ALL GUILD CONFIGURATIONS ===\n');

    for (const guild of guilds) {
        console.log(`\n📋 ${guild.name}`);
        console.log(`Guild ID: ${guild.id}`);
        
        const config = await db.getGuildConfig(guild.id);
        
        if (!config) {
            console.log('❌ NOT CONFIGURED in database');
            continue;
        }

        console.log(`Killfeed Channel: ${config.killfeed_channel_id || '❌ NULL'}`);
        console.log(`Connections Channel: ${config.connections_channel_id || '❌ NULL'}`);
        console.log(`Nitrado Service ID: ${config.nitrado_service_id || '❌ NULL'}`);
        console.log(`Nitrado Instance: ${config.nitrado_instance || '❌ NULL'}`);
        console.log(`Active: ${config.is_active ? '✅ Yes' : '❌ No'}`);
        
        if (!config.killfeed_channel_id) {
            console.log('⚠️  WARNING: Killfeed channel not set - kills/hits won\'t be posted!');
        }
        if (!config.nitrado_service_id || !config.nitrado_instance) {
            console.log('⚠️  WARNING: Nitrado credentials incomplete - can\'t fetch logs!');
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('✅ Original server has killfeed_channel_id set');
    console.log('Check above for other servers - they may need their killfeed channels configured');

    process.exit(0);
}

checkAllGuilds().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
