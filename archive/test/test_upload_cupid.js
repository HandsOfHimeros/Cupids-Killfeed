// Test uploading to Cupid.json to see if it works
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';
const INSTANCE = 'ni11886592_2';

const testJson = [
    {
        "item": "Test",
        "location": "TestLocation"
    }
];

async function testUpload() {
    try {
        console.log('Testing upload to Cupid.json (like spawn system does)...');
        
        const filePath = `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.enoch/custom/Cupid.json`;
        console.log('File path:', filePath);
        
        const url = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(filePath)}`;
        
        const response = await axios.post(url, JSON.stringify(testJson), {
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
