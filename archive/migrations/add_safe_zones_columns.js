require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addSafeZonesColumns() {
    try {
        console.log('Adding safe_zones and auto_ban_in_safe_zones columns to guild_configs table...');
        
        // Add safe_zones JSONB column
        await pool.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS safe_zones JSONB DEFAULT '[]'::jsonb
        `);
        
        // Add auto_ban_in_safe_zones BOOLEAN column
        await pool.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS auto_ban_in_safe_zones BOOLEAN DEFAULT false
        `);
        
        console.log('✅ Successfully added safe zones columns');
        console.log('   - safe_zones: JSONB (default: empty array)');
        console.log('   - auto_ban_in_safe_zones: BOOLEAN (default: false)');
        console.log('   Format: [{"name": "Zone Name", "x1": 1000, "z1": 2000, "x2": 2000, "z2": 3000}]');
        
    } catch (error) {
        console.error('Error adding safe zones columns:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

addSafeZonesColumns();
