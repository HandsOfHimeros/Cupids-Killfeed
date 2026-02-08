// Script to add a spawn entry to Cupid with a restart_id
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
  // Always return { Objects: [...] }
  if (res.data && Array.isArray(res.data.Objects)) {
    return { Objects: res.data.Objects };
  } else if (res.data && Array.isArray(res.data)) {
    // If file is just an array, wrap it
    return { Objects: res.data };
  } else {
    return { Objects: [] };
  }
}

const FormData = require('form-data');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function uploadCupidJson(json) {
  // Write to a temp file
  const tmpPath = path.join(os.tmpdir(), `Cupid_${Date.now()}.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(json, null, 2), 'utf8');
  const url = `${BASE_URL}/${SERVICE_ID}/gameservers/file_server/upload?file=${encodeURIComponent(FILE_PATH)}`;
  const form = new FormData();
  form.append('file', fs.createReadStream(tmpPath), {
    filename: 'Cupid.json',
    contentType: 'application/json'
  });
  await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${API_TOKEN}`
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  fs.unlinkSync(tmpPath);
}

(async () => {
  try {
    // Accept a local JSON file as input for the new entry
    const fs = require('fs');
    let newEntry = { name: "TestItem", pos: [0,0,0], ypr: [0,0,0], scale: 1, enableCEPersistency: 0, customString: "" };
    if (process.argv[2]) {
      try {
        const fileContent = fs.readFileSync(process.argv[2], 'utf8');
        newEntry = JSON.parse(fileContent);
      } catch (e) {
        console.error('Failed to read or parse input file:', e.message);
        process.exit(1);
      }
    }
    const restart_id = process.argv[3] || Date.now().toString();
    newEntry.restart_id = restart_id;
    let cupidJson = { Objects: [] };
    try {
      cupidJson = await getCupidJson();
      if (!cupidJson.Objects || !Array.isArray(cupidJson.Objects)) cupidJson.Objects = [];
    } catch (e) {
      cupidJson = { Objects: [] };
    }
    cupidJson.Objects.push(newEntry);
    await uploadCupidJson(cupidJson);
    console.log('New spawn entry added to Cupid:', newEntry);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
})();
