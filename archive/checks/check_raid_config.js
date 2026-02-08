const db = require('./database.js');

async function checkRaidConfig() {
    try {
        const guilds = await db.getAllGuildConfigs();
        
        console.log('\n=== RAID CONFIGURATION CHECK ===\n');
        
        for (const guild of guilds) {
            if (guild.raid_schedule_enabled) {
                console.log(`Guild: ${guild.guild_id}`);
                console.log(`  Schedule Enabled: ${guild.raid_schedule_enabled}`);
                console.log(`  Currently Active: ${guild.raid_currently_active}`);
                console.log(`  Start: Day ${guild.raid_start_day} at ${guild.raid_start_time}`);
                console.log(`  End: Day ${guild.raid_end_day} at ${guild.raid_end_time}`);
                console.log(`  Timezone: ${guild.raid_timezone}`);
                
                // Check current time in guild's timezone
                const timezone = guild.raid_timezone || 'America/New_York';
                try {
                    const now = new Date().toLocaleString('en-US', { timeZone: timezone });
                    const currentDate = new Date(now);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    console.log(`  Current Time (${timezone}): ${dayNames[currentDate.getDay()]} ${currentDate.toLocaleTimeString()}`);
                } catch (e) {
                    console.log(`  ERROR: Invalid timezone: ${timezone}`);
                }
                console.log('---');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRaidConfig();
