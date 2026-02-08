const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function checkSakhalBuild() {
    try {
        const result = await pool.query(`
            SELECT 
                guild_id,
                server_name,
                build_channel_id,
                suicide_channel_id,
                nitrado_server_id,
                nitrado_service_id
            FROM guild_configs
            ORDER BY guild_id
        `);
        
        console.log('\n=== All Server Configs ===\n');
        result.rows.forEach(row => {
            console.log(`Server: ${row.server_name}`);
            console.log(`  Guild ID: ${row.guild_id}`);
            console.log(`  Build Channel: ${row.build_channel_id || 'NOT SET'}`);
            console.log(`  Suicide Channel: ${row.suicide_channel_id || 'NOT SET'}`);
            console.log(`  Nitrado Server: ${row.nitrado_server_id || 'NOT SET'}`);
            console.log(`  Nitrado Service: ${row.nitrado_service_id || 'NOT SET'}`);
            console.log('');
        });
        
        // Check specifically for Sakhal
        const sakhal = result.rows.find(r => r.server_name.toLowerCase().includes('sakhal'));
        if (sakhal) {
            console.log('=== Sakhal Analysis ===');
            console.log('Build channel set:', !!sakhal.build_channel_id);
            console.log('Suicide channel set:', !!sakhal.suicide_channel_id);
            console.log('Nitrado IDs set:', !!sakhal.nitrado_server_id && !!sakhal.nitrado_service_id);
        } else {
            console.log('❌ Sakhal server not found in guild_configs!');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkSakhalBuild();
