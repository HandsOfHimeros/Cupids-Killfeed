require('dotenv').config();
const db = require('./database.js');
const axios = require('axios');

async function testCfgameplay() {
    // Get your test guild ID (replace with actual)
    const guildId = '1461070029175918662'; // Your test guild
    
    const guildConfig = await db.getGuildConfig(guildId);
    
    if (!guildConfig) {
        console.log('No guild config found');
        return;
    }
    
    console.log('Guild Config:', {
        guild_id: guildConfig.guild_id,
        guild_name: guildConfig.guild_name,
        map_name: guildConfig.map_name,
        nitrado_instance: guildConfig.nitrado_instance,
        nitrado_service_id: guildConfig.nitrado_service_id
    });
    
    // Try multiple possible paths
    const paths = [
        `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfgameplay.json`,
        `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/db/cfgameplay.json`,
        `/games/${guildConfig.nitrado_instance}/ftproot/dayzps/dayzOffline.${guildConfig.map_name}/cfgameplay.json`,
    ];
    
    const BASE_URL = 'https://api.nitrado.net/services';
    
    for (const GAMEPLAY_FILE_PATH of paths) {
        console.log('\nAttempting to download from:', GAMEPLAY_FILE_PATH);
    
    try {
        const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(GAMEPLAY_FILE_PATH)}`;
        console.log('Download URL:', downloadUrl);
        
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        console.log('\nDownload response status:', downloadResp.status);
        console.log('Download response data:', downloadResp.data);
        
        const fileUrl = downloadResp.data.data.token.url;
        console.log('\nFile URL:', fileUrl);
        
        const fileResp = await axios.get(fileUrl);
        const gameplayJson = fileResp.data;
        
        console.log('\nFile downloaded successfully from:', GAMEPLAY_FILE_PATH);
        console.log('objectSpawnersArr:', gameplayJson.objectSpawnersArr);
        break;
        
    } catch (err) {
        console.error('ERROR with path:', GAMEPLAY_FILE_PATH);
        console.error('Error message:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }
    }
    
    process.exit(0);
}

testCfgameplay();
