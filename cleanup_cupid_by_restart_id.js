// Script to clean up Cupid.json by removing entries with an old restart_id
// Usage: node cleanup_cupid_by_restart_id.js <current_restart_id>

const axios = require('axios');

const API_TOKEN = process.env.NITRATOKEN || 't_ehg0OdD7koDXd1gwPcILYs6jfzIfRKIDDmStjUz1ceqKl4SFsXrp2p4PaC25NfEQDw5z0sgK1KT8qruOSVKC4lhcA1TwfLf_KX';
const SERVICE_ID = process.env.ID1 || '17292046';
const FILE_PATH = '/games/ni11886592_1/ftproot/dayzps_missions/dayzOffline.chernarusplus/custom/Cupid.json';
const BASE_URL = 'https://api.nitrado.net/services';

async function getCupidJson() {
  const url = `${BASE_URL}/${SERVICE_ID}/gameservers/file_server/download?file=${encodeURIComponent(FILE_PATH)}`;
  const res = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` },
    responseType: 'json'
  });
  return res.data;
}

async function uploadCupidJson(json) {
  const url = `${BASE_URL}/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(FILE_PATH)}`;
  await axios.post(url, JSON.stringify(json), {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

(async () => {
  try {
    const current_restart_id = process.argv[2];
    if (!current_restart_id) throw new Error('You must provide the current restart_id!');
    let cupidJson = [];
    try {
      cupidJson = await getCupidJson();
      if (!Array.isArray(cupidJson)) cupidJson = [];
    } catch (e) {
      cupidJson = [];
    }
    const filtered = cupidJson.filter(entry => entry.restart_id === current_restart_id);
    await uploadCupidJson(filtered);
    console.log('Cupid.json cleaned. Remaining entries:', filtered.length);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
})();
