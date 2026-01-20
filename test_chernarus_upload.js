// Test uploading to the Chernarus server that works with spawn
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '17292046'; // Chernarus - we know this works
const INSTANCE = 'ni11886592_1';

const testJson = {
    "areaName": "RestrictedArea-test",
    "PRABoxes": [[[10, 5, 10], [0, 0, 0], [1000, 100, 1000]]],
    "safePositions3D": [[500, 50, 500]]
};

async function testUpload() {
    try {
        console.log('Testing upload to Chernarus server (known working)...');
        
        const filePath = `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.chernarusplus/custom/teleport-test.json`;
        console.log('File path:', filePath);
        
        const url = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(filePath)}`;
        
        const response = await axios.post(url, JSON.stringify(testJson, null, 4), {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('\n✅ Upload successful!');
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        
    } catch (error) {
        console.log('\n❌ Upload failed!');
        console.log('Status:', error.response?.status, error.response?.statusText);
        console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }
}

testUpload();
