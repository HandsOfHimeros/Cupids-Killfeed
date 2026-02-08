const { pool } = require('./database');

async function setAllChannelIds() {
    console.log('Setting channel IDs for all servers...\n');
    
    // Livonia - has all channels
    console.log('📝 Livonia:');
    await pool.query(`
        UPDATE guild_configs 
        SET build_channel_id = $1, suicide_channel_id = $2
        WHERE guild_id = $3
    `, ['1455446097609625653', '1455446098901598323', '1445943557020979274']);
    console.log('  ✅ Build channel: 1455446097609625653');
    console.log('  ✅ Suicide channel: 1455446098901598323');
    
    // For Chernarus and Sakhal, we'll need to create the missing channels
    // Or you can tell me if they already exist with different names
    
    console.log('\n✅ Livonia channels configured!');
    console.log('\n⚠️  Chernarus and Sakhal need suicide/build channels created.');
    console.log('Would you like me to have the bot create them automatically?');
    
    process.exit(0);
}

setAllChannelIds().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
