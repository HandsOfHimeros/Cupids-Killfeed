const db = require('./database');

async function checkAllServers() {
    console.log('=== CHECKING ALL CONFIGURED SERVERS ===\n');
    
    try {
        const result = await db.pool.query(`
            SELECT guild_id, map_name, killfeed_channel_id, build_channel_id, suicide_channel_id, connections_channel_id, is_active
            FROM guild_configs
            ORDER BY guild_id
        `);
        
        console.log(`Found ${result.rows.length} configured guilds:\n`);
        
        for (const row of result.rows) {
            console.log(`Guild ID: ${row.guild_id}`);
            console.log(`  Map: ${row.map_name}`);
            console.log(`  Killfeed Channel: ${row.killfeed_channel_id || 'NOT SET'}`);
            console.log(`  Build Channel: ${row.build_channel_id || 'NOT SET'}`);
            console.log(`  Suicide Channel: ${row.suicide_channel_id || 'NOT SET'}`);
            console.log(`  Connections Channel: ${row.connections_channel_id || 'NOT SET'}`);
            console.log(`  Active: ${row.is_active || 'NOT SET'}`);
            console.log('');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

checkAllServers();
