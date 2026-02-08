// Clear stuck last_killfeed_line for World of Pantheon to force reposting
const db = require('./database.js');

async function fix() {
    try {
        const guildId = '1386432422744162476'; // World of Pantheon
        
        // Clear the last_killfeed_line to force the bot to repost everything
        await db.query(
            'UPDATE guild_configs SET last_killfeed_line = NULL WHERE guild_id = $1',
            [guildId]
        );
        
        console.log(`✅ Cleared last_killfeed_line for guild ${guildId}`);
        console.log('The bot will now repost all events in the current ADM log on next poll');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fix();
