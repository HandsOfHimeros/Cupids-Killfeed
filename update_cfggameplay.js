require('dotenv').config();
const db = require('./database.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');

async function updateCfggameplay() {
    const guildId = '1461070029175918662'; // Your test guild
    
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        console.error('Guild not configured');
        process.exit(1);
    }
    
    const GAMEPLAY_FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
    const GAMEPLAY_FTP_PATH = `/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
    const BASE_URL = 'https://api.nitrado.net/services';
    
    console.log('[UPDATE] Downloading cfggameplay.json from:', GAMEPLAY_FILE_PATH);
    
    try {
        // Download cfggameplay.json
        const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(GAMEPLAY_FILE_PATH)}`;
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const fileUrl = downloadResp.data.data.token.url;
        const fileResp = await axios.get(fileUrl);
        const gameplayJson = fileResp.data;
        
        console.log('[UPDATE] Current objectSpawnersArr:', gameplayJson.objectSpawnersArr);
        
        // Check if spawn.json is already registered
        const spawnJsonPath = "./custom/spawn.json";
        if (!gameplayJson.objectSpawnersArr) {
            gameplayJson.objectSpawnersArr = [];
        }
        
        if (!gameplayJson.objectSpawnersArr.includes(spawnJsonPath)) {
            gameplayJson.objectSpawnersArr.push(spawnJsonPath);
            console.log('[UPDATE] Added "./custom/spawn.json" to objectSpawnersArr');
            console.log('[UPDATE] New objectSpawnersArr:', gameplayJson.objectSpawnersArr);
            
            // Get FTP credentials
            console.log('[UPDATE] Getting FTP credentials...');
            const infoUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers`;
            const infoResp = await axios.get(infoUrl, {
                headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
            });
            
            const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
            const ftpHost = ftpCreds.hostname;
            const ftpUser = ftpCreds.username;
            const ftpPass = ftpCreds.password;
            const ftpPort = ftpCreds.port || 21;
            
            console.log(`[UPDATE] FTP: ${ftpUser}@${ftpHost}:${ftpPort}`);
            
            // Upload via FTP
            const client = new Client();
            client.ftp.verbose = false;
            
            try {
                await client.access({
                    host: ftpHost,
                    user: ftpUser,
                    password: ftpPass,
                    port: ftpPort,
                    secure: false
                });
                
                console.log('[UPDATE] Connected to FTP');
                
                // Write to temp file and upload
                const gameplayTmpPath = path.join(__dirname, 'logs', `cfggameplay_manual_${Date.now()}.json`);
                fs.writeFileSync(gameplayTmpPath, JSON.stringify(gameplayJson, null, 2), 'utf8');
                
                console.log('[UPDATE] Uploading to:', GAMEPLAY_FTP_PATH);
                await client.uploadFrom(gameplayTmpPath, GAMEPLAY_FTP_PATH);
                fs.unlinkSync(gameplayTmpPath);
                
                console.log('[UPDATE] ✅ Successfully updated cfggameplay.json!');
                console.log('[UPDATE] spawn.json is now registered in objectSpawnersArr');
            } finally {
                client.close();
            }
        } else {
            console.log('[UPDATE] ✅ "./custom/spawn.json" already registered in objectSpawnersArr');
            console.log('[UPDATE] No changes needed!');
        }
        
    } catch (err) {
        console.error('[UPDATE] ❌ Error:', err.message);
        if (err.response) {
            console.error('[UPDATE] Response:', err.response.data);
        }
        console.error('[UPDATE] Stack:', err.stack);
        process.exit(1);
    }
    
    process.exit(0);
}

updateCfggameplay();
