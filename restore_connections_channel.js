const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function restoreConnectionsChannel() {
    try {
        const result = await pool.query(`
            UPDATE guild_configs 
            SET connections_channel_id = '1405195781639770224'
            WHERE guild_id = '1386432422744162476'
            RETURNING connections_channel_id
        `);
        
        console.log('✅ Restored Chernarus connections channel:', result.rows[0].connections_channel_id);
        
        await pool.end();
        console.log('✅ Connections channel restored! Bot will now post connection events.');
        
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
}

restoreConnectionsChannel();
