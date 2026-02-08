const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addAdmTracking() {
    try {
        console.log('Adding last_adm_filename column to guild_configs...');
        
        await pool.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS last_adm_filename TEXT
        `);
        
        console.log('✅ Successfully added last_adm_filename column');
        console.log('This will help track server restarts and prevent missing kills');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

addAdmTracking();
