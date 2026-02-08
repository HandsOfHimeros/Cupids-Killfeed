const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkKillfeed() {
    try {
        const result = await pool.query(`
            SELECT guild_id, killfeed_channel_id, auto_ban_on_kill, nitrado_service_id, 
                   last_killfeed_line
            FROM guild_configs 
            WHERE guild_id = '1386432422744162476'
        `);
        
        console.log('World of Pantheon killfeed config:');
        console.log(result.rows[0]);
        
        console.log('\n\nLast killfeed line (first 200 chars):');
        console.log(result.rows[0]?.last_killfeed_line?.substring(0, 200));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkKillfeed();
