// Test parsing events from the log to see what event types are being detected
const axios = require('axios');
const db = require('./database');

async function testParseEvents() {
    const guildId = '1386432422744162476';
    const guildConfig = await db.getGuildConfig(guildId);

    if (!guildConfig) {
        console.log('Guild not found');
        process.exit(1);
    }

    // Fetch the log file
    const listUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/list?dir=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/`;
    
    const listResp = await axios.get(listUrl, {
        headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    if (!listResp.data?.data?.entries) {
        console.log('No log files found');
        process.exit(1);
    }
    
    // Find most recent .ADM file
    const admFiles = listResp.data.data.entries
        .filter(e => e.name.endsWith('.ADM'))
        .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
    
    if (admFiles.length === 0) {
        console.log('No .ADM files found');
        process.exit(1);
    }
    
    const mostRecentFile = admFiles[0];
    console.log(`Most recent log file: ${mostRecentFile.name}`);
    
    // Download it
    const downloadUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/${mostRecentFile.name}`;
    
    const downloadResp = await axios.get(downloadUrl, {
        headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    const fileUrl = downloadResp.data.data.token.url;
    const logResp = await axios.get(fileUrl);
    const logData = logResp.data;
    
    // Parse events
    const lines = logData.split(/\r?\n/);
    console.log(`\nTotal lines: ${lines.length}`);
    
    // Get last 50 lines
    const recentLines = lines.slice(-50);
    console.log('\n=== LAST 50 LINES ===');
    recentLines.forEach((line, i) => {
        console.log(`${lines.length - 50 + i}: ${line}`);
    });
    
    console.log('\n=== PARSING FOR EVENTS ===');
    
    const events = [];
    for (const line of recentLines) {
        let match;
        
        if (line.includes('killed by')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) killed by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
            if (match) {
                const event = { type: 'kill', time: match[1], victim: match[2], killer: match[3], weapon: match[4], raw: line };
                events.push(event);
                console.log(`KILL: ${event.killer} killed ${event.victim} with ${event.weapon}`);
            }
        } else if (line.includes('hit by') && !line.includes('transporthit')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) hit by Player \"(.+?)\"\(id=[^)]*\) with (.+) into (.+)$/);
            if (match) {
                const event = { type: 'hit', time: match[1], victim: match[2], attacker: match[3], weapon: match[4], bodypart: match[5], raw: line };
                events.push(event);
                console.log(`HIT: ${event.attacker} hit ${event.victim} with ${event.weapon} in ${event.bodypart}`);
            }
        } else if (line.includes('connected')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) has been connected$/);
            if (match) {
                const event = { type: 'connected', time: match[1], player: match[2], raw: line };
                events.push(event);
                console.log(`CONNECTED: ${event.player}`);
            }
        } else if (line.includes('disconnected')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) has been disconnected$/);
            if (match) {
                const event = { type: 'disconnected', time: match[1], player: match[2], raw: line };
                events.push(event);
                console.log(`DISCONNECTED: ${event.player}`);
            }
        } else if (line.includes('committed suicide')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) committed suicide$/);
            if (match) {
                const event = { type: 'suicide', time: match[1], player: match[2], raw: line };
                events.push(event);
                console.log(`SUICIDE: ${event.player}`);
            }
        } else if (line.includes('placed') || line.includes('raised')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) (placed|raised) (.+) at position/);
            if (match) {
                const event = { type: 'build', time: match[1], player: match[2], action: match[3], item: match[4], raw: line };
                events.push(event);
                console.log(`BUILD: ${event.player} ${event.action} ${event.item}`);
            }
        }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total events found: ${events.length}`);
    const eventTypes = {};
    events.forEach(e => {
        eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
    });
    console.log('Event types:', eventTypes);
    
    process.exit(0);
}

testParseEvents().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
