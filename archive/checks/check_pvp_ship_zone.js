const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkZones() {
    try {
        // Check all configs with their zones
        const all = await pool.query(`
            SELECT guild_id, nitrado_service_id, auto_ban_on_kill, 
                   jsonb_array_length(COALESCE(pvp_zones, '[]'::jsonb)) as zone_count
            FROM guild_configs
        `);
        console.log('All guild configs with zone counts:');
        console.log(all.rows);
        
        const result = await pool.query(`
            SELECT nitrado_service_id, pvp_zones 
            FROM guild_configs 
            WHERE jsonb_array_length(COALESCE(pvp_zones, '[]'::jsonb)) > 0
        `);
        
        console.log('Chernarus PVP Zones:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        if (result.rows[0]?.pvp_zones) {
            console.log('\n\nParsed zones:');
            result.rows[0].pvp_zones.forEach((zone, i) => {
                console.log(`\n${i + 1}. ${zone.name}`);
                console.log(`   Min: (${zone.min_x}, ${zone.min_z})`);
                console.log(`   Max: (${zone.max_x}, ${zone.max_z})`);
                const width = zone.max_x - zone.min_x;
                const height = zone.max_z - zone.min_z;
                console.log(`   Size: ${width}m × ${height}m`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkZones();
