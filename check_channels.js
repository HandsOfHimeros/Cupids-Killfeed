const db = require('./database.js');

async function checkChannels() {
    try {
        const client = await db.pool.connect();
        
        try {
            const result = await client.query(
                'SELECT guild_id, killfeed_channel_id, connections_channel_id, admin_channel_id FROM guild_configs WHERE guild_id = $1',
                ['1386432422744162476']
            );
            
            if (result.rows.length === 0) {
                console.log('❌ Guild not found!');
            } else {
                const config = result.rows[0];
                console.log('\n=== ORIGINAL SERVER CHANNELS ===');
                console.log('Killfeed Channel ID:', config.killfeed_channel_id);
                console.log('Connections Channel ID:', config.connections_channel_id);
                console.log('Admin Channel ID:', config.admin_channel_id);
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

checkChannels();
