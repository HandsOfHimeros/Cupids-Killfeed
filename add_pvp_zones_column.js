// Migration script to add pvp_zones column to guild_configs
require('dotenv').config();
const db = require('./database.js');

async function addPvpZonesColumn() {
    try {
        console.log('Adding pvp_zones column to guild_configs table...');
        
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS pvp_zones JSONB DEFAULT '[]'::jsonb
        `);
        
        console.log('✅ Successfully added pvp_zones column');
        console.log('   Default value: [] (empty array - no PVP zones)');
        console.log('   Format: [{"name": "Zone Name", "x1": 1000, "z1": 2000, "x2": 2000, "z2": 3000}]');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding pvp_zones column:', error);
        process.exit(1);
    }
}

addPvpZonesColumn();
