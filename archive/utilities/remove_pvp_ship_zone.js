const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function removeZone() {
    try {
        // Get current zones
        const current = await pool.query(`
            SELECT pvp_zones 
            FROM guild_configs 
            WHERE nitrado_service_id = '17292046'
        `);
        
        console.log('Current zones:', current.rows[0].pvp_zones.length);
        
        // Filter out the pvp ship zone
        const zones = current.rows[0].pvp_zones;
        const filtered = zones.filter(z => z.name !== 'pvp ship');
        
        console.log('After removing pvp ship:', filtered.length);
        console.log('\nRemaining zones:');
        filtered.forEach(z => console.log(`  - ${z.name}`));
        
        // Update database
        await pool.query(`
            UPDATE guild_configs 
            SET pvp_zones = $1
            WHERE nitrado_service_id = '17292046'
        `, [JSON.stringify(filtered)]);
        
        console.log('\n✅ Successfully removed "pvp ship" zone!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

removeZone();
