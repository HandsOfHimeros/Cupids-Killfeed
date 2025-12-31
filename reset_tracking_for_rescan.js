require('dotenv').config();
const db = require('./database');

async function resetTrackingForRescan() {
    try {
        console.log('🔄 Resetting killfeed tracking for all servers...');
        
        const guilds = await db.getAllGuildConfigs();
        console.log(`Found ${guilds.length} configured servers\n`);
        
        for (const guild of guilds) {
            console.log(`Resetting tracking for guild ${guild.guild_id} (${guild.map_name})`);
            console.log(`  Current tracking: ${guild.last_killfeed_line || 'NULL'}`);
            
            await db.updateKillfeedState(guild.guild_id, null);
            
            console.log(`  ✅ Reset complete - will rescan entire current log file\n`);
        }
        
        console.log('✅ All servers reset! Bot will now rescan all logs on next poll.');
        console.log('⚠️  This is a ONE-TIME rescan - bot will update tracking after posting events.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetTrackingForRescan();
