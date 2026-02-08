require('dotenv').config();
const db = require('./database.js');

(async () => {
    try {
        const result = await db.query(`
            SELECT 
                guild_id,
                killfeed_channel_id,
                auto_ban_on_kill,
                auto_ban_in_safe_zones
            FROM guild_configs 
            WHERE guild_id = '1386432422744162476'
        `);
        
        console.log('World of Pantheon Config:');
        console.log(JSON.stringify(result.rows[0], null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
