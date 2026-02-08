const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkCurrentLog() {
    try {
        // Get Livonia config
        const result = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', ['1445943557020979274']);
        const guildConfig = result.rows[0];
        
        console.log('📋 Livonia Configuration:');
        console.log('Service ID:', guildConfig.nitrado_service_id);
        console.log('Last line processed:', guildConfig.last_killfeed_line?.substring(0, 80) || '(none)');
        console.log('');
        
        // Get list of log files
        const listUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/list?dir=/games/ni${guildConfig.nitrado_service_id}_1/noftp/dayzps/config/DayZServer_PS4_x64*.ADM`;
        
        https.get(listUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const files = JSON.parse(data).data.entries;
                const mostRecent = files.sort((a, b) => b.name.localeCompare(a.name))[0];
                
                console.log('📁 Most recent log file:', mostRecent.name);
                console.log('');
                
                // Download most recent log
                const downloadUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=/games/ni${guildConfig.nitrado_service_id}_1/noftp/dayzps/config/${mostRecent.name}`;
                
                https.get(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
                }, (res2) => {
                    let logData = '';
                    res2.on('data', chunk => logData += chunk);
                    res2.on('end', async () => {
                        const lines = logData.split('\n');
                        
                        // Find build events after 00:10:23
                        console.log('🔍 Looking for build events after 00:10:23...\n');
                        
                        let foundLastLine = false;
                        const newBuildEvents = [];
                        
                        for (const line of lines) {
                            if (line.includes('00:10:23') && line.includes('disconnected')) {
                                foundLastLine = true;
                                continue;
                            }
                            
                            if (foundLastLine && (line.includes('placed') || line.includes('raised') || line.includes('dismantled') || line.includes('Built'))) {
                                newBuildEvents.push(line);
                            }
                        }
                        
                        if (newBuildEvents.length > 0) {
                            console.log(`✅ Found ${newBuildEvents.length} new build event(s):\n`);
                            newBuildEvents.forEach(event => console.log(event));
                        } else {
                            console.log('❌ No new build events found after 00:10:23');
                            console.log('\n📝 Last 10 lines of log:');
                            lines.slice(-10).forEach(line => console.log(line));
                        }
                        
                        await pool.end();
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkCurrentLog();
