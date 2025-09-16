// Script to create a folder named 'cupid' in the Nitrado custom missions directory
// Run with: node create_nitrado_cupid_folder.js

const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN || 't_ehg0OdD7koDXd1gwPcILYs6jfzIfRKIDDmStjUz1ceqKl4SFsXrp2p4PaC25NfEQDw5z0sgK1KT8qruOSVKC4lhcA1TwfLf_KX';
const SERVICE_ID = process.env.ID1 || '17292046';
const DIRECTORY = '/games/17292046/ftproot/dayzps_missions/dayzOffline.chernarusplus/custom/cupid';

const BASE_URL = 'https://api.nitrado.net/services';

async function createFolder() {
  const url = `${BASE_URL}/${SERVICE_ID}/gameservers/file_server/create_folder`;
  const res = await axios.post(url, {
    dir: DIRECTORY
  }, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` }
  });
  return res.data;
}

(async () => {
  try {
    const result = await createFolder();
    console.log('Folder creation result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
})();
