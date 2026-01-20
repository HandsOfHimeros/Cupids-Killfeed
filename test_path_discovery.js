// Test different path combinations for Nitrado
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';
const INSTANCE = 'ni11886592_2';

const paths = [
    `/games/${INSTANCE}/ftproot/dayzps/config/ServerDZ/cfggameplay.json`,
    `/games/${INSTANCE}/ftproot/dayzxb/config/ServerDZ/cfggameplay.json`,
    `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.enoch/cfggameplay.json`,
    `/games/${INSTANCE}/ftproot/config/ServerDZ/cfggameplay.json`,
    `/dayzps/config/ServerDZ/cfggameplay.json`,
    `/dayzxb/config/ServerDZ/cfggameplay.json`,
];

async function testDownload(filePath) {
    try {
        const url = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/download?file=${encodeURIComponent(filePath)}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            },
            timeout: 10000
        });
        
        console.log(`✅ SUCCESS: ${filePath}`);
        console.log(`   Status: ${response.status}`);
        if (typeof response.data === 'object' && response.data.playerRestrictedAreaFiles) {
            console.log(`   Has playerRestrictedAreaFiles:`, response.data.playerRestrictedAreaFiles.length, 'entries');
        }
        return filePath;
    } catch (error) {
        console.log(`❌ FAILED: ${filePath}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
        }
        return null;
    }
}

async function findCorrectPath() {
    console.log(`Testing paths for Service ID: ${SERVICE_ID}, Instance: ${INSTANCE}\n`);
    
    for (const path of paths) {
        const result = await testDownload(path);
        if (result) {
            console.log(`\n🎯 FOUND WORKING PATH: ${result}`);
            return;
        }
        console.log('');
    }
    
    console.log('\n❌ No working path found!');
}

findCorrectPath();
