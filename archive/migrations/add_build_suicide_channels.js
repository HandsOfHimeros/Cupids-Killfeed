const { pool } = require('./database');

async function addBuildAndSuicideChannels() {
    console.log('Adding build_channel_id and suicide_channel_id columns to guild_configs...\n');
    
    try {
        await pool.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS build_channel_id TEXT,
            ADD COLUMN IF NOT EXISTS suicide_channel_id TEXT
        `);
        console.log('✅ Columns added successfully!');
        
        // Now set the channel IDs for Chernarus (your original server)
        // Based on your old system, these are the channels that were working
        console.log('\nSetting channel IDs for Chernarus...');
        
        // You'll need to tell me the actual channel IDs for:
        // - suicide-logs channel
        // - build-log channel
        // on your original server
        
        console.log('\n⚠️  Need to set channel IDs. What are the Discord channel IDs for:');
        console.log('   - suicide-logs channel on Chernarus?');
        console.log('   - build-log channel on Chernarus?');
        console.log('\nOnce you provide these, I can update all three servers.');
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
}

addBuildAndSuicideChannels();
