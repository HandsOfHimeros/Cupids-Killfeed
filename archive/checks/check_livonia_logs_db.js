const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkLivoniaLogs() {
    try {
        // Get Livonia config
        const result = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', ['1445943557020979274']);
        const guildConfig = result.rows[0];
        
        console.log('📋 Livonia Configuration:');
        console.log('Service ID:', guildConfig.nitrado_service_id);
        console.log('Killfeed Channel:', guildConfig.killfeed_channel_id);
        console.log('Build Channel:', guildConfig.build_channel_id);
        console.log('');
        
        // List log files
        const url = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/list?dir=/games/ni${guildConfig.nitrado_service_id}_1/noftp/dayzps/config/DayZServer_PS4_x64*.ADM`;
        
        https.get(url, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
                try {
                    const files = JSON.parse(data).data.entries;
                    console.log('📁 Recent log files (newest first):');
                    files.sort((a, b) => b.name.localeCompare(a.name)).slice(0, 5).forEach((f, i) => {
                        const date = new Date(f.modified * 1000);
                        console.log(`${i + 1}. ${f.name}`);
                        console.log(`   Modified: ${date.toISOString()}`);
                        console.log(`   Size: ${f.size} bytes`);
                    });
                    
                    console.log('\n🔍 Checking current tracking...');
                    const trackingResult = await pool.query('SELECT last_log_file, last_line_number FROM guild_configs WHERE guild_id = $1', ['1445943557020979274']);
                    console.log('Last tracked file:', trackingResult.rows[0].last_log_file);
                    console.log('Last line number:', trackingResult.rows[0].last_line_number);
                    
                    await pool.end();
                } catch (err) {
                    console.error('Error:', err);
                    await pool.end();
                }
            });
        }).on('error', e => console.error('Request error:', e));
        
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkLivoniaLogs();
