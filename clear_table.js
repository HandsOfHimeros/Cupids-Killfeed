// Clear table entry for a player
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function clearTable() {
    try {
        const result = await pool.query(
            'DELETE FROM player_spawn_tables WHERE dayz_player_name = $1',
            ['handsofhimeros']
        );
        console.log(`✅ Cleared ${result.rowCount} table entries for handsofhimeros`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

clearTable();
