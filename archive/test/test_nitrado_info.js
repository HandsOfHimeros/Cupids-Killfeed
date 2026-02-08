// Test getting Nitrado gameserver info (includes FTP data)
const axios = require('axios');
const config = require('./config.json');

async function getNitradoGameserverInfo() {
    try {
        const url = `https://api.nitrado.net/services/${config.ID1}/gameservers`;
        const resp = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${config.NITRATOKEN}` }
        });
        
        console.log('Gameserver Info:');
        console.log(JSON.stringify(resp.data, null, 2));
        
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

getNitradoGameserverInfo();
