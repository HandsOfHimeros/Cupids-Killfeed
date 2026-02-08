// Add killfeed state tracking to guild_configs
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addKillfeedState() {
    try {
        console.log('Adding last_killfeed_line column to guild_configs...');
        
        await pool.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS last_killfeed_line TEXT DEFAULT '';
        `);
        
        console.log('✓ Column added successfully');
        
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        await pool.end();
    }
}

addKillfeedState();
