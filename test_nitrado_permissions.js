// Check Nitrado API token permissions
require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN;

async function checkPermissions() {
    try {
        console.log('Checking Nitrado API token info...\n');
        
        // Get token info
        const response = await axios.get(
            'https://api.nitrado.net/user',
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`
                }
            }
        );
        
        console.log('User Info:');
        console.log('  Username:', response.data.data.user.username);
        console.log('  User ID:', response.data.data.user.user_id);
        console.log('  Credit:', response.data.data.user.credit);
        
        // Get services
        const servicesResponse = await axios.get(
            'https://api.nitrado.net/services',
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`
                }
            }
        );
        
        console.log('\nServices:');
        servicesResponse.data.data.services.forEach(service => {
            console.log(`  - ID: ${service.id}, Type: ${service.type}, Status: ${service.status}`);
        });
        
    } catch (error) {
        console.log('❌ Error:', error.response?.status, error.response?.statusText);
        console.log(JSON.stringify(error.response?.data, null, 2));
    }
}

checkPermissions();
