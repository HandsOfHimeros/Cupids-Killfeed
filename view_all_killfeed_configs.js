const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkKillfeedChannels() {
    try {
        const result = await pool.query(`
            SELECT 
                guild_id,
                killfeed_channel_id,
                connections_channel_id,
                build_channel_id,
                suicide_channel_id,
                auto_ban_on_kill,
                auto_ban_in_safe_zones,
                show_death_locations,
                last_killfeed_line,
                nitrado_service_id
            FROM guild_configs 
            ORDER BY guild_id
        `);
        
        console.log(`Found ${result.rows.length} guild configurations:\n`);
        
        result.rows.forEach((guild, i) => {
            console.log(`${i + 1}. Guild ID: ${guild.guild_id}`);
            console.log(`   Nitrado Service: ${guild.nitrado_service_id}`);
            console.log(`   Killfeed Channel: ${guild.killfeed_channel_id || 'NOT SET'}`);
            console.log(`   Connections Channel: ${guild.connections_channel_id || 'NOT SET'}`);
            console.log(`   Build Channel: ${guild.build_channel_id || 'NOT SET'}`);
            console.log(`   Suicide Channel: ${guild.suicide_channel_id || 'NOT SET'}`);
            console.log(`   Auto-ban on kill: ${guild.auto_ban_on_kill}`);
            console.log(`   Auto-ban in safe zones: ${guild.auto_ban_in_safe_zones}`);
            console.log(`   Show death locations: ${guild.show_death_locations}`);
            console.log(`   Last killfeed line: ${guild.last_killfeed_line ? guild.last_killfeed_line.substring(0, 80) + '...' : 'NULL'}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkKillfeedChannels();
