// Script to empty Cupid on Nitrado (remove all spawn entries)
// Usage: node empty_cupid_json.js

const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN || 't_ehg0OdD7koDXd1gwPcILYs6jfzIfRKIDDmStjUz1ceqKl4SFsXrp2p4PaC25NfEQDw5z0sgK1KT8qruOSVKC4lhcA1TwfLf_KX';
const SERVICE_ID = process.env.ID1 || '17292046';
const FILE_PATH = '/games/ni11886592_1/ftproot/dayzps_missions/dayzOffline.chernarusplus/custom/Cupid.json';
const BASE_URL = 'https://api.nitrado.net/services';

async function emptyCupidJson() {
  const url = `${BASE_URL}/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(FILE_PATH)}`;
  await axios.post(url, JSON.stringify([]), {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

(async () => {
  try {
    await emptyCupidJson();
  console.log('Cupid has been emptied.');
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
})();
