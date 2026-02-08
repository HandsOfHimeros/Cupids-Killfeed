const db = require('./database.js');

const guildId = '1386432422744162476';
const killfeedChannelId = '1404256735245373511';

async function setKillfeedChannel() {
    try {
        const client = await db.pool.connect();
        
        try {
            await client.query(
                'UPDATE guild_configs SET killfeed_channel_id = $1 WHERE guild_id = $2',
                [killfeedChannelId, guildId]
            );
            
            console.log('✅ Successfully set killfeed channel!');
            console.log(`Guild: ${guildId}`);
            console.log(`Killfeed Channel: ${killfeedChannelId}`);
            
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setKillfeedChannel();
