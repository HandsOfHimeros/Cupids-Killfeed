// Update World of Pantheon suicide channel
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function updateSuicideChannel() {
    const guildId = '1386432422744162476'; // World of Pantheon
    const suicideChannelId = '1414744890813845645';
    
    try {
        // Check current config
        const current = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
        console.log('Current config:', current.rows[0]);
        
        // Update suicide channel
        await pool.query(
            'UPDATE guild_configs SET suicide_channel_id = $1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $2',
            [suicideChannelId, guildId]
        );
        
        console.log(`✅ Updated suicide channel ID to ${suicideChannelId} for World of Pantheon`);
        
        // Verify
        const updated = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
        console.log('Updated config:', updated.rows[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateSuicideChannel();
