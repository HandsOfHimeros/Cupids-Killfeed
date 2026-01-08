const config = require('./config.json');
const https = require('https');

const guildId = '1445943557020979274'; // Livonia
const guildConfig = config.guilds.find(g => g.guildId === guildId);

console.log('📋 Livonia Server:', guildConfig.nitradoServiceId);
console.log('🔍 Checking recent log files...\n');

const url = `https://api.nitrado.net/services/${guildConfig.nitradoServiceId}/gameservers/file_server/list?dir=/games/ni${guildConfig.nitradoServiceId}_1/noftp/dayzps/config/DayZServer_PS4_x64*.ADM`;

https.get(url, {
    headers: { 'Authorization': `Bearer ${guildConfig.nitradoToken}` }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const files = JSON.parse(data).data.entries;
            console.log('📁 Recent log files (newest first):');
            files.sort((a, b) => b.name.localeCompare(a.name)).slice(0, 10).forEach((f, i) => {
                const date = new Date(f.modified * 1000);
                console.log(`${i + 1}. ${f.name}`);
                console.log(`   Modified: ${date.toISOString()}`);
                console.log(`   Size: ${f.size} bytes\n`);
            });
        } catch (err) {
            console.error('Error parsing response:', err);
        }
    });
}).on('error', e => console.error('Request error:', e));
