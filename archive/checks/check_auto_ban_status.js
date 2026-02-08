// Check auto-ban status
const db = require('./database.js');

async function checkAutoBan() {
    try {
        const result = await db.query(
            `SELECT guild_id, auto_ban_on_kill, auto_ban_in_safe_zones, pvp_zones 
             FROM guild_configs 
             WHERE guild_id IS NOT NULL`
        );
        
        console.log('=== AUTO-BAN STATUS ===\n');
        for (const config of result.rows) {
            console.log(`Guild ID: ${config.guild_id}`);
            console.log(`  Auto-ban on kill (PVE mode): ${config.auto_ban_on_kill ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`  Auto-ban in safe zones: ${config.auto_ban_in_safe_zones ? '✅ ENABLED' : '❌ DISABLED'}`);
            const pvpZones = config.pvp_zones || [];
            console.log(`  PVP zones: ${pvpZones.length} configured`);
            if (pvpZones.length > 0) {
                pvpZones.forEach((zone, i) => {
                    console.log(`    ${i+1}. ${zone.name} - Center: (${zone.x}, ${zone.z}), Radius: ${zone.radius}m`);
                });
            }
            console.log('');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAutoBan();
