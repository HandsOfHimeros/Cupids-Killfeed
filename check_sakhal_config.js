const db = require('./database.js');

async function checkSakhalConfig() {
    try {
        const client = await db.pool.connect();
        
        try {
            const result = await client.query(
                'SELECT guild_id, nitrado_service_id, map_name, channels, restart_hours FROM guild_configs WHERE guild_id = $1',
                ['1445957198000820316']
            );
            
            if (result.rows.length === 0) {
                console.log('❌ Sakhal server not found in database!');
            } else {
                const config = result.rows[0];
                console.log('\n=== SAKHAL SERVER CONFIG ===');
                console.log('Guild ID:', config.guild_id);
                console.log('Nitrado Service ID:', config.nitrado_service_id);
                console.log('Map:', config.map_name);
                console.log('Restart Hours:', config.restart_hours);
                console.log('\nChannels:');
                const channels = config.channels;
                console.log('  Killfeed Channel:', channels.killfeed_channel_id);
                console.log('  Connections Channel:', channels.connections_channel_id);
                console.log('  Admin Channel:', channels.admin_channel_id);
            }
            
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSakhalConfig();
