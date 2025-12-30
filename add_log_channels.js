// Add buildlog and suicidelog channel columns to guild_configs
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addLogChannels() {
    try {
        console.log('Adding buildlog_channel_id and suicidelog_channel_id columns...');
        
        await pool.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS buildlog_channel_id VARCHAR(20),
            ADD COLUMN IF NOT EXISTS suicidelog_channel_id VARCHAR(20)
        `);
        
        console.log('✅ Columns added successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addLogChannels();
