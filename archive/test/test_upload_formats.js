// Test different upload formats
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;
const SERVICE_ID = '18077896';
const INSTANCE = 'ni11886592_2';

const testJson = {"test": "data"};
const filePath = `/games/${INSTANCE}/ftproot/dayzps_missions/dayzOffline.enoch/custom/test.json`;

async function testFormat1() {
    console.log('Format 1: Query param with JSON body');
    try {
        const response = await axios.post(
            `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(filePath)}`,
            JSON.stringify(testJson),
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ SUCCESS\n');
        return true;
    } catch (error) {
        console.log('❌ FAILED:', error.response?.status, '\n');
        return false;
    }
}

async function testFormat2() {
    console.log('Format 2: Body with path and file properties');
    try {
        const response = await axios.post(
            `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload`,
            {
                path: filePath,
                file: JSON.stringify(testJson)
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ SUCCESS\n');
        return true;
    } catch (error) {
        console.log('❌ FAILED:', error.response?.status, '\n');
        return false;
    }
}

async function testFormat3() {
    console.log('Format 3: FormData multipart');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', JSON.stringify(testJson), {
        filename: 'test.json',
        contentType: 'application/json'
    });
    form.append('path', filePath);
    
    try {
        const response = await axios.post(
            `https://api.nitrado.net/services/${SERVICE_ID}/gameservers/file_server/upload`,
            form,
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    ...form.getHeaders()
                }
            }
        );
        console.log('✅ SUCCESS\n');
        return true;
    } catch (error) {
        console.log('❌ FAILED:', error.response?.status, '\n');
        return false;
    }
}

async function runTests() {
    await testFormat1();
    await testFormat2();
    await testFormat3();
}

runTests();
