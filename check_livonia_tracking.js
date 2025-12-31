const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkTracking() {
    try {
        const result = await pool.query('SELECT guild_id, last_log_file, last_line_number FROM guild_configs WHERE guild_id = $1', ['1445943557020979274']);
        
        console.log('📋 Livonia Tracking State:');
        console.log('Last Log File:', result.rows[0].last_log_file);
        console.log('Last Line Number:', result.rows[0].last_line_number);
        console.log('');
        console.log('🔍 The generator was placed in: DayZServer_PS4_x64_2025-12-31_00-01-49.ADM at line with "00:06:34"');
        console.log('');
        
        if (result.rows[0].last_log_file === 'DayZServer_PS4_x64_2025-12-31_00-01-49.ADM') {
            console.log('✅ Bot is tracking the correct file!');
            console.log('⚠️ But the last_line_number is:', result.rows[0].last_line_number);
            console.log('💡 The generator event might have already been processed (or skipped before build parsing was added)');
        } else {
            console.log('❌ Bot is tracking a different file!');
            console.log('💡 Need to check why the bot thinks there\'s a newer file');
        }
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkTracking();
