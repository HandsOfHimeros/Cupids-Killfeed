require('dotenv').config();
const db = require('./database.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');

async function fixCfggameplay() {
    const guildId = '1461070029175918662'; // Your test guild
    
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        console.error('Guild not configured');
        process.exit(1);
    }
    
    const GAMEPLAY_FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
    const GAMEPLAY_FTP_PATH = `/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
    const BASE_URL = 'https://api.nitrado.net/services';
    
    console.log('[FIX] Downloading cfggameplay.json...');
    
    try {
        // Download cfggameplay.json as TEXT (not parsed JSON)
        const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(GAMEPLAY_FILE_PATH)}`;
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const fileUrl = downloadResp.data.data.token.url;
        const fileResp = await axios.get(fileUrl, { responseType: 'text' });
        let fileContent = fileResp.data;
        
        console.log('[FIX] Downloaded file');
        
        // Check if spawn.json is already in objectSpawnersArr
        const spawnJsonPath = '"./custom/spawn.json"';
        
        if (fileContent.includes(spawnJsonPath)) {
            console.log('[FIX] spawn.json already in file');
            
            // Find and replace EMPTY objectSpawnersArr with one containing spawn.json
            // This will catch: "objectSpawnersArr": []
            fileContent = fileContent.replace(
                /"objectSpawnersArr"\s*:\s*\[\s*\]/g,
                `"objectSpawnersArr": [\n        "./custom/spawn.json"\n    ]`
            );
            
            console.log('[FIX] Updated empty objectSpawnersArr entries');
        } else {
            console.log('[FIX] spawn.json NOT found, adding it...');
            
            // Find empty objectSpawnersArr and add spawn.json to it
            fileContent = fileContent.replace(
                /"objectSpawnersArr"\s*:\s*\[\s*\]/,
                `"objectSpawnersArr": [\n        "./custom/spawn.json"\n    ]`
            );
        }
        
        // Get FTP credentials
        console.log('[FIX] Getting FTP credentials...');
        const infoUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers`;
        const infoResp = await axios.get(infoUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
        const ftpHost = ftpCreds.hostname;
        const ftpUser = ftpCreds.username;
        const ftpPass = ftpCreds.password;
        const ftpPort = ftpCreds.port || 21;
        
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
            
            console.log('[FIX] Connected to FTP');
            
            // Write to temp file and upload
            const gameplayTmpPath = path.join(__dirname, 'logs', `cfggameplay_fixed_${Date.now()}.json`);
            fs.writeFileSync(gameplayTmpPath, fileContent, 'utf8');
            
            console.log('[FIX] Uploading fixed file...');
            await client.uploadFrom(gameplayTmpPath, GAMEPLAY_FTP_PATH);
            fs.unlinkSync(gameplayTmpPath);
            
            console.log('[FIX] ✅ Successfully fixed cfggameplay.json!');
            console.log('[FIX] The file now has spawn.json in the ORIGINAL objectSpawnersArr location');
        } finally {
            client.close();
        }
        
    } catch (err) {
        console.error('[FIX] ❌ Error:', err.message);
        if (err.response) {
            console.error('[FIX] Response:', err.response.data);
        }
        console.error('[FIX] Stack:', err.stack);
        process.exit(1);
    }
    
    process.exit(0);
}

fixCfggameplay();
