// Test script to check if we can read/write spawn.json on Nitrado
const axios = require('axios');
const config = require('./config.json');

const FILE_PATH = `/games/${config.ID2}/ftproot/dayzps_missions/dayzOffline.chernarusplus/custom/spawn.json`;
const BASE_URL = 'https://api.nitrado.net/services';

async function testSpawnAccess() {
    try {
        console.log('Testing spawn.json access...');
        console.log('File path:', FILE_PATH);
        
        // Try to download
        console.log('\n1. Downloading spawn.json...');
        const downloadUrl = `${BASE_URL}/${config.ID1}/gameservers/file_server/download?file=${encodeURIComponent(FILE_PATH)}`;
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${config.NITRATOKEN}` }
        });
        
        const fileUrl = downloadResp.data.data.token.url;
        const fileResp = await axios.get(fileUrl);
        console.log('✅ Successfully downloaded spawn.json');
        console.log('Current content:', JSON.stringify(fileResp.data, null, 2));
        
        // Try to upload back
        console.log('\n2. Testing upload...');
        const uploadUrl = `${BASE_URL}/${config.ID1}/gameservers/file_server/upload?file=${encodeURIComponent(FILE_PATH)}`;
        
        const testData = fileResp.data;
        await axios.post(uploadUrl, JSON.stringify(testData, null, 2), {
            headers: {
                'Authorization': `Bearer ${config.NITRATOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Successfully uploaded to spawn.json');
        console.log('\n✨ spawn.json is accessible and writable!');
        
    } catch (err) {
        console.error('❌ Error:', err.response ? err.response.data : err.message);
        if (err.response) {
            console.error('Response status:', err.response.status);
            console.error('Response data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testSpawnAccess();
