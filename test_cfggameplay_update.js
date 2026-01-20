// Test script to verify cfggameplay.json update logic
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';
const INSTANCE = 'ni11886592_2';
const SERVER_NAME = 'enoch';

async function testCfgGameplayUpdate() {
    try {
        console.log('Testing cfggameplay.json update logic...\n');

        const headers = {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        };

        // 1. Download current cfggameplay.json
        console.log('1. Downloading cfggameplay.json...');
        const cfgGameplayPath = `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.${SERVER_NAME}/cfggameplay.json`;
        const downloadResponse = await axios.get(
            `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/download?file=${encodeURIComponent(cfgGameplayPath)}`,
            { headers }
        );

        const fileUrl = downloadResponse.data.data.token.url;
        const fileResp = await axios.get(fileUrl);
        let cfgGameplay = fileResp.data;

        if (typeof cfgGameplay === 'string') {
            cfgGameplay = JSON.parse(cfgGameplay);
        }

        console.log('✅ Downloaded successfully');
        console.log('Has playerRestrictedAreaFiles:', !!cfgGameplay.playerRestrictedAreaFiles);
        if (cfgGameplay.playerRestrictedAreaFiles) {
            console.log('Current entries:', cfgGameplay.playerRestrictedAreaFiles);
        }

        // 2. Add/create playerRestrictedAreaFiles
        console.log('\n2. Updating playerRestrictedAreaFiles...');
        
        if (!cfgGameplay.playerRestrictedAreaFiles) {
            console.log('⚠️  playerRestrictedAreaFiles does NOT exist - creating it');
            cfgGameplay.playerRestrictedAreaFiles = [];
        } else {
            console.log('✅ playerRestrictedAreaFiles exists');
        }

        const testFileName = 'custom/teleport-devil2krona.json';
        if (!cfgGameplay.playerRestrictedAreaFiles.includes(testFileName)) {
            cfgGameplay.playerRestrictedAreaFiles.push(testFileName);
            console.log(`✅ Added ${testFileName} to array`);
        } else {
            console.log(`ℹ️  ${testFileName} already in array`);
        }

        console.log('Final array:', cfgGameplay.playerRestrictedAreaFiles);

        // 3. Save to temp file for inspection
        const tmpPath = path.join(__dirname, 'logs', `cfggameplay_test_${Date.now()}.json`);
        fs.writeFileSync(tmpPath, JSON.stringify(cfgGameplay, null, 4), 'utf8');
        console.log(`\n3. Saved updated file to: ${tmpPath}`);
        console.log('File size:', fs.statSync(tmpPath).size, 'bytes');

        // 4. Get FTP credentials and upload
        console.log('\n4. Getting FTP credentials...');
        const infoUrl = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers`;
        const infoResp = await axios.get(infoUrl, { headers });

        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
        console.log(`FTP: ${ftpCreds.username}@${ftpCreds.hostname}:${ftpCreds.port || 21}`);

        console.log('\n5. Uploading via FTP...');
        const client = new Client();
        client.ftp.verbose = false;

        try {
            await client.access({
                host: ftpCreds.hostname,
                user: ftpCreds.username,
                password: ftpCreds.password,
                port: ftpCreds.port || 21,
                secure: false
            });

            console.log('✅ Connected to FTP');

            const ftpCfgPath = `/dayzps_missions/dayzOffline.${SERVER_NAME}/cfggameplay.json`;
            await client.uploadFrom(tmpPath, ftpCfgPath);

            console.log('✅ Successfully uploaded cfggameplay.json via FTP!');
            console.log(`\n🎯 playerRestrictedAreaFiles now has ${cfgGameplay.playerRestrictedAreaFiles.length} entries`);
            
        } finally {
            client.close();
        }

        // Cleanup temp file
        fs.unlinkSync(tmpPath);
        console.log('\n✅ Test complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testCfgGameplayUpdate();
