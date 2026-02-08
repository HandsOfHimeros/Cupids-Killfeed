// Check why auto-ban didn't trigger for this specific kill
const db = require('./database.js');

async function checkAutoBanForKill() {
    try {
        // Get guild config
        const configs = await db.getAllGuildConfigs();
        const guild = configs[0]; // Assuming first guild
        
        console.log('\n=== AUTO-BAN CONFIGURATION ===');
        console.log(`Guild ID: ${guild.guild_id}`);
        console.log(`Auto-ban enabled: ${guild.auto_ban_on_kill ? '✅ YES' : '❌ NO'}`);
        console.log(`Auto-ban in safe zones: ${guild.auto_ban_in_safe_zones ? '✅ YES' : '❌ NO'}`);
        
        // Check PVP zones
        const pvpZones = guild.pvp_zones || [];
        console.log(`\nPVP Zones configured: ${pvpZones.length}`);
        
        if (pvpZones.length > 0) {
            console.log('\nPVP ZONES:');
            pvpZones.forEach((zone, i) => {
                console.log(`  ${i+1}. ${zone.name}`);
                console.log(`     Center: (${zone.x}, ${zone.z})`);
                console.log(`     Radius: ${zone.radius}m`);
            });
        }
        
        // Check if kill location (4536, 13159) is in any PVP zone
        const killX = 4536;
        const killZ = 13159;
        
        console.log(`\n=== KILL LOCATION CHECK ===`);
        console.log(`Kill happened at: (${killX}, ${killZ})`);
        
        let inPvpZone = false;
        for (const zone of pvpZones) {
            const distance = Math.sqrt(Math.pow(killX - zone.x, 2) + Math.pow(killZ - zone.z, 2));
            const isInside = distance <= zone.radius;
            
            console.log(`\nDistance to ${zone.name}: ${Math.round(distance)}m (radius: ${zone.radius}m)`);
            console.log(`Inside zone: ${isInside ? '✅ YES' : '❌ NO'}`);
            
            if (isInside) {
                inPvpZone = true;
                console.log(`\n⚠️ KILL WAS INSIDE PVP ZONE: ${zone.name}`);
                console.log(`This is why auto-ban did NOT trigger!`);
            }
        }
        
        if (!inPvpZone && pvpZones.length > 0) {
            console.log(`\n✅ Kill was OUTSIDE all PVP zones`);
        }
        
        console.log(`\n=== DIAGNOSIS ===`);
        if (!guild.auto_ban_on_kill) {
            console.log(`❌ AUTO-BAN IS DISABLED`);
            console.log(`Enable it with: /admin killfeed autoban state:on`);
        } else if (inPvpZone) {
            console.log(`⚠️ Kill was inside PVP zone, auto-ban correctly skipped`);
        } else {
            console.log(`🐛 BUG: Auto-ban should have triggered but didn't!`);
            console.log(`Killer should have been banned.`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAutoBanForKill();
