const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function reset() {
    try {
        await pool.query(`
            UPDATE guild_configs 
            SET last_killfeed_line = NULL
            WHERE guild_id = '1386432422744162476'
        `);
        
        console.log('✅ Reset killfeed tracking for World of Pantheon');
        console.log('Next poll will post all events in the current log');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

reset();
