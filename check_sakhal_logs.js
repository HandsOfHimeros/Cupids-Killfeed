const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkSakhalLogs() {
    try {
        const result = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', ['1445957198000820316']);
        const config = result.rows[0];
        
        console.log('\n=== FETCHING SAKHAL LOGS ===\n');
        
        // Get file browser
        const listResp = await axios.get(
            `https://api.nitrado.net/services/${config.nitrado_service_id}/gameservers/file_server/list`,
            { 
                headers: { 'Authorization': config.nitrado_token },
                params: { dir: `/games/${config.nitrado_instance}/noftp/dayzps/config/${config.platform}Profiles` }
            }
        );
        
        // Find most recent log
        const logFiles = listResp.data.data.entries.filter(f => f.name.endsWith('.ADM'));
        logFiles.sort((a, b) => b.modified_at - a.modified_at);
        const mostRecent = logFiles[0];
        
        console.log(`Most recent log: ${mostRecent.name}`);
        
        // Get download token
        const downloadResp = await axios.get(
            `https://api.nitrado.net/services/${config.nitrado_service_id}/gameservers/file_server/download`,
            {
                headers: { 'Authorization': config.nitrado_token },
                params: { file: mostRecent.path }
            }
        );
        
        const fileUrl = downloadResp.data.data.token.url;
        
        // Fetch log content
        const logResp = await axios.get(fileUrl, { responseType: 'text' });
        const logText = logResp.data;
        const lines = logText.split(/\r?\n/);
        
        // Look for connection events
        console.log('\n=== SEARCHING FOR CONNECTION EVENTS ===\n');
        
        let connected = 0;
        let disconnected = 0;
        
        for (const line of lines) {
            if (line.includes('is connected')) {
                connected++;
                console.log(`✅ CONNECTED: ${line}`);
            } else if (line.includes('has been disconnected')) {
                disconnected++;
                console.log(`❌ DISCONNECTED: ${line}`);
            }
        }
        
        console.log(`\n=== SUMMARY ===`);
        console.log(`Total lines: ${lines.length}`);
        console.log(`Connected events: ${connected}`);
        console.log(`Disconnected events: ${disconnected}`);
        
        await pool.end();
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
        process.exit(1);
    }
}

checkSakhalLogs();
