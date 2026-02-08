require('dotenv').config();
const db = require('./database');

async function fixChernarusBuildChannel() {
    try {
        const chernarusGuildId = '1386432422744162476';
        const correctBuildChannelId = '1414742322192846972';
        
        console.log('🔧 Fixing Chernarus build channel...');
        console.log('Guild ID:', chernarusGuildId);
        console.log('Correct Build Channel ID:', correctBuildChannelId);
        
        await db.pool.query(`
            UPDATE guild_configs 
            SET build_channel_id = $2
            WHERE guild_id = $1
        `, [chernarusGuildId, correctBuildChannelId]);
        
        console.log('✅ Chernarus build channel updated!');
        
        // Verify
        const config = await db.getGuildConfig(chernarusGuildId);
        console.log('\n📋 Updated Configuration:');
        console.log('build_channel_id:', config.build_channel_id);
        console.log('suicide_channel_id:', config.suicide_channel_id);
        console.log('killfeed_channel_id:', config.killfeed_channel_id);
        console.log('connections_channel_id:', config.connections_channel_id);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixChernarusBuildChannel();
