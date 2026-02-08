// Test uploading to an EXISTING file (cfggameplay.json)
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896'; // Dev bot - Enoch/Livonia
const INSTANCE = 'ni11886592_2';

async function testExistingFileUpload() {
    try {
        // First download the existing cfggameplay.json
        const downloadPath = `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.enoch/cfggameplay.json`;
        console.log('Downloading existing cfggameplay.json...');
        
        const downloadResponse = await axios.get(
            `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/download?file=${encodeURIComponent(downloadPath)}`,
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`
                }
            }
        );
        
        console.log('✅ Downloaded successfully\n');
        
        // Now try to upload it back (should work if file exists)
        console.log('Uploading back to same file...');
        
        const uploadResponse = await axios.post(
            `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(downloadPath)}`,
            JSON.stringify(downloadResponse.data, null, 4),
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Upload to existing file SUCCESSFUL!');
        console.log('Status:', uploadResponse.status);
        console.log('Response:', uploadResponse.data);
        
    } catch (error) {
        console.log('❌ Failed!');
        console.log('Status:', error.response?.status, error.response?.statusText);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    }
}

testExistingFileUpload();
