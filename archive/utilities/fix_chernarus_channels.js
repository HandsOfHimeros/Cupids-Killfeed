const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixChernarus() {
    try {
        // Copy buildlog_channel_id to build_channel_id and suicidelog_channel_id to suicide_channel_id
        const result = await pool.query(`
            UPDATE guild_configs 
            SET build_channel_id = buildlog_channel_id,
                suicide_channel_id = suicidelog_channel_id
            WHERE guild_id = '1386432422744162476'
            RETURNING *
        `);
        
        console.log('✅ Updated Chernarus configuration:');
        console.log('build_channel_id:', result.rows[0].build_channel_id);
        console.log('suicide_channel_id:', result.rows[0].suicide_channel_id);
        console.log('buildlog_channel_id:', result.rows[0].buildlog_channel_id);
        console.log('suicidelog_channel_id:', result.rows[0].suicidelog_channel_id);
        
        await pool.end();
        console.log('\n✅ Chernarus channels fixed!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
}

fixChernarus();
