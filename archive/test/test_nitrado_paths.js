// Test Nitrado file paths
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';

async function testPaths() {
    const paths = [
        '/games/servers/18077896/dayzps/config/ServerDZ/cfggameplay.json',
        '/games/ni18077896_1/ftproot/dayzps/config/ServerDZ/cfggameplay.json',
        '/games/ni18077896_1/ftproot/dayzps_missions/dayzOffline.enoch/cfggameplay.json',
    ];

    for (const testPath of paths) {
        try {
            console.log(`\nTrying path: ${testPath}`);
            const url = `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/download?file=${encodeURIComponent(testPath)}`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${API_TOKEN}` }
            });
            console.log('✅ SUCCESS! This path works!');
            console.log('Response type:', typeof response.data);
            if (typeof response.data === 'object') {
                console.log('First key:', Object.keys(response.data)[0]);
            }
            break;
        } catch (error) {
            console.log('❌ Failed:', error.response?.status, error.response?.statusText || error.message);
        }
    }
}

testPaths();
