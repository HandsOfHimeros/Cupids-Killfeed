// Test downloading cfggameplay.json to find correct path
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';

const paths = [
    '/games/ni11886592_2/ftproot/dayzps_missions/dayzOffline.enoch/cfggameplay.json',
    '/games/ni11886592_2/ftproot/dayzps/config/ServerDZ/cfggameplay.json',
    '/games/ni11886592_2/ftproot/dayzxb/config/ServerDZ/cfggameplay.json',
    '/dayzps/config/ServerDZ/cfggameplay.json',
];

async function testDownload(filePath) {
    try {
        const url = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/download?file=${encodeURIComponent(filePath)}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        
        console.log(`✅ SUCCESS with path: ${filePath}`);
        console.log(`Status: ${response.status}`);
        console.log(`Data type: ${typeof response.data}`);
        if (typeof response.data === 'object') {
            console.log(`Keys:`, Object.keys(response.data).slice(0, 5));
        }
        return true;
    } catch (error) {
        console.log(`❌ FAILED: ${filePath}`);
        if (error.response) {
            console.log(`  Status: ${error.response.status} ${error.response.statusText}`);
        } else {
            console.log(`  Error: ${error.message}`);
        }
        return false;
    }
}

async function findCorrectPath() {
    console.log('Testing different path structures...\n');
    
    for (const path of paths) {
        await testDownload(path);
        console.log('');
    }
}

findCorrectPath();
