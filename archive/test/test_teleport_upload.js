// Test Nitrado upload for teleport
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';
const INSTANCE = 'ni11886592_2';

const testJson = {
    "areaName": "RestrictedArea-test",
    "PRABoxes": [
        [
            [10, 5, 10],
            [0, 0, 0],
            [1000, 100, 1000]
        ]
    ],
    "safePositions3D": [
        [500, 50, 500]
    ]
};

async function testUpload() {
    try {
        console.log('Token:', API_TOKEN ? `${API_TOKEN.substring(0, 20)}...` : 'MISSING');
        console.log('Service ID:', SERVICE_ID);
        console.log('Instance:', INSTANCE);
        
        const filePath = `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.enoch/custom/teleport-test.json`;
        console.log('File path:', filePath);
        
        const url = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(filePath)}`;
        console.log('URL:', url);
        
        const body = JSON.stringify(testJson, null, 4);
        console.log('Body length:', body.length);
        console.log('Body preview:', body.substring(0, 100) + '...');
        
        const headers = {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        };
        console.log('Headers:', headers);
        
        console.log('\nSending request...');
        const response = await axios.post(url, body, { headers });
        
        console.log('\n✅ Upload successful!');
        console.log('Response:', response.data);
    } catch (error) {
        console.error('\n❌ Upload failed!');
        console.error('Status:', error.response?.status, error.response?.statusText);
        console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Full error:', error.message);
    }
}

testUpload();
