// Script to add a spawn entry to Cupid.json with a restart_id
// Usage: node add_spawn_with_restart_id.js '{"item":"YourItem","location":"YourLocation"}' <restart_id>

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
    const newEntry = process.argv[2] ? JSON.parse(process.argv[2]) : { item: "TestItem", location: "TestLocation" };
    const restart_id = process.argv[3] || Date.now().toString();
    newEntry.restart_id = restart_id;
    let cupidJson = [];
    try {
      cupidJson = await getCupidJson();
      if (!Array.isArray(cupidJson)) cupidJson = [];
    } catch (e) {
      cupidJson = [];
    }
    cupidJson.push(newEntry);
    await uploadCupidJson(cupidJson);
    console.log('New spawn entry added to Cupid.json:', newEntry);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
})();
