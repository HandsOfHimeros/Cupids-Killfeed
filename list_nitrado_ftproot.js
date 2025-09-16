// Script to list contents of '/games/17292046/ftproot/' using the Nitrado API
// Run with: node list_nitrado_ftproot.js

const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN || 't_ehg0OdD7koDXd1gwPcILYs6jfzIfRKIDDmStjUz1ceqKl4SFsXrp2p4PaC25NfEQDw5z0sgK1KT8qruOSVKC4lhcA1TwfLf_KX';
const SERVICE_ID = process.env.ID1 || '17292046';
const DIRECTORY = '/games/17292046/ftproot';

const BASE_URL = 'https://api.nitrado.net/services';

async function listFiles() {
  const url = `${BASE_URL}/${SERVICE_ID}/gameservers/file_server/list?dir=${encodeURIComponent(DIRECTORY)}`;
  const res = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` }
  });
  return res.data.data.entries;
}

(async () => {
  try {
    const files = await listFiles();
    if (!files.length) {
      console.log('No files or folders found in ftproot.');
      return;
    }
    console.log('Contents of ftproot:');
    for (const file of files) {
      console.log(`- ${file.name} (${file.type})`);
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
})();
