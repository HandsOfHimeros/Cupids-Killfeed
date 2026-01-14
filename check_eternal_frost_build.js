const db = require('./database');

async function checkEternalFrostBuild() {
    const eternalFrostId = '1445943557020979274';
    
    console.log('=== ETERNAL FROST BUILD LOG CHECK ===\n');
    
    try {
        const config = await db.getGuildConfig(eternalFrostId);
        
        if (!config) {
            console.log('❌ Eternal Frost not configured in database!');
            process.exit(1);
        }
        
        console.log('Guild Config:');
        console.log('  Guild ID:', config.guild_id);
        console.log('  Map:', config.map_name);
        console.log('  Killfeed Channel:', config.killfeed_channel_id || 'NOT SET');
        console.log('  Build Channel:', config.build_channel_id || '❌ NOT SET');
        console.log('  Suicide Channel:', config.suicide_channel_id || 'NOT SET');
        console.log('  Connections Channel:', config.connections_channel_id || 'NOT SET');
        console.log('  Active:', config.is_active);
        
        if (!config.build_channel_id) {
            console.log('\n❌ BUILD CHANNEL IS NOT SET! This is the problem.');
            console.log('   Build events won\'t be posted because there\'s no channel ID configured.');
        } else {
            console.log('\n✅ Build channel is configured.');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

checkEternalFrostBuild();
