const db = require('./database.js');

async function checkRaidSchedulerConfig() {
    try {
        console.log('Checking raid scheduler configuration...\n');
        
        const result = await db.query(`
            SELECT 
                guild_id,
                raid_schedule_enabled,
                raid_start_day,
                raid_start_time,
                raid_end_day,
                raid_end_time,
                raid_currently_active,
                raid_timezone
            FROM guild_configs
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ No guilds configured in database!');
            process.exit(0);
        }
        
        for (const guild of result.rows) {
            console.log(`\n📊 Guild: ${guild.guild_id}`);
            console.log(`   Schedule Enabled: ${guild.raid_schedule_enabled} ${guild.raid_schedule_enabled ? '✅' : '❌ DISABLED'}`);
            console.log(`   Start: Day ${guild.raid_start_day} at ${guild.raid_start_time}`);
            console.log(`   End: Day ${guild.raid_end_day} at ${guild.raid_end_time}`);
            console.log(`   Currently Active: ${guild.raid_currently_active}`);
            console.log(`   Timezone: ${guild.raid_timezone || 'America/New_York (default)'}`);
            
            if (!guild.raid_schedule_enabled) {
                console.log(`   ⚠️  AUTO SCHEDULER IS DISABLED FOR THIS GUILD!`);
            }
            
            if (guild.raid_start_day === null || !guild.raid_start_time || guild.raid_end_day === null || !guild.raid_end_time) {
                console.log(`   ⚠️  MISSING SCHEDULE DATA - Scheduler will skip this guild!`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        const enabledCount = result.rows.filter(g => g.raid_schedule_enabled).length;
        console.log(`\n✅ Guilds with scheduler ENABLED: ${enabledCount}/${result.rows.length}`);
        
        if (enabledCount === 0) {
            console.log('\n❌ NO GUILDS HAVE AUTO SCHEDULER ENABLED!');
            console.log('   Use `/admin killfeed raiding schedule` to enable');
        }
        
    } catch (error) {
        console.error('Error checking configuration:', error);
    } finally {
        process.exit(0);
    }
}

checkRaidSchedulerConfig();
