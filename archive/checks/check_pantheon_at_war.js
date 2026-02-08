const db = require('./database');

async function checkPantheonAtWar() {
    const pantheonAtWarId = '1312098464175157248';
    
    console.log('=== CHECKING PANTHEON AT WAR ===\n');
    
    try {
        const config = await db.getGuildConfig(pantheonAtWarId);
        
        if (!config) {
            console.log('❌ PANTHEON AT WAR IS NOT CONFIGURED IN DATABASE!');
            console.log(`   Guild ID ${pantheonAtWarId} not found`);
            console.log('   This is why Livonia build logs are not working!');
        } else {
            console.log('✅ Pantheon at War is configured:');
            console.log('  Guild ID:', config.guild_id);
            console.log('  Map:', config.map_name);
            console.log('  Killfeed Channel:', config.killfeed_channel_id || 'NOT SET');
            console.log('  Build Channel:', config.build_channel_id || 'NOT SET');
            console.log('  Suicide Channel:', config.suicide_channel_id || 'NOT SET');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

checkPantheonAtWar();
