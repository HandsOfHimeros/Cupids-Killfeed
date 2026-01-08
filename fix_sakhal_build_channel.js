const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateSakhalBuildChannel() {
    const sakhalGuildId = '1445957198000820316';
    const buildChannelId = '1455793417870246049'; // Found from Discord
    
    try {
        // Check current value
        const check = await pool.query(
            'SELECT build_channel_id, suicide_channel_id FROM guild_configs WHERE guild_id = $1',
            [sakhalGuildId]
        );
        
        console.log('\n=== Current Sakhal Config ===');
        console.log('Build Channel:', check.rows[0]?.build_channel_id || 'NOT SET');
        console.log('Suicide Channel:', check.rows[0]?.suicide_channel_id || 'NOT SET');
        
        // Update if not set
        if (!check.rows[0]?.build_channel_id) {
            console.log('\n⚠️  Build channel not set! Updating...');
            await pool.query(
                'UPDATE guild_configs SET build_channel_id = $1 WHERE guild_id = $2',
                [buildChannelId, sakhalGuildId]
            );
            console.log('✅ Updated build_channel_id to', buildChannelId);
        } else {
            console.log('\n✅ Build channel already set!');
        }
        
        // Verify
        const verify = await pool.query(
            'SELECT build_channel_id FROM guild_configs WHERE guild_id = $1',
            [sakhalGuildId]
        );
        console.log('\n=== After Update ===');
        console.log('Build Channel:', verify.rows[0].build_channel_id);
        
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

updateSakhalBuildChannel();
