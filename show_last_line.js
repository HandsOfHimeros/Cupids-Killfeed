const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLastLine() {
    try {
        const result = await pool.query(`
            SELECT last_killfeed_line 
            FROM guild_configs 
            WHERE guild_id = '1386432422744162476'
        `);
        
        console.log('=== LAST SAVED LINE IN DATABASE ===');
        console.log(result.rows[0].last_killfeed_line);
        console.log('\n=== END ===');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkLastLine();
