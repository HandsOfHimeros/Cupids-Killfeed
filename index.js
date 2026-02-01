// Load environment variables FIRST before any other imports
require('dotenv').config();

// Start Stripe webhook server if configured
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('[STRIPE] Starting webhook server...');
    require('./stripe_webhook.js');
} else {
    console.log('[STRIPE] Webhook server disabled - missing Stripe environment variables');
}

// --- Killfeed Channel Monitor ---
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Pool } = require('pg');
const db = require('./database.js');
const MultiGuildKillfeed = require('./multi_guild_killfeed.js');

// Helper function to get platform-specific path
function getPlatformPath(platform) {
    if (!platform) return 'dayzps'; // Default to PS for backwards compatibility
    const plat = platform.toUpperCase();
    if (plat === 'XBOX' || plat === 'XB') return 'dayzxb';
    if (plat === 'PS4' || plat === 'PS5' || plat === 'PLAYSTATION') return 'dayzps';
    return 'dayzstandalone'; // PC fallback
}

// Create database pool for spawn tables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Queue system to prevent concurrent spawn.json writes per guild
const spawnWriteQueues = new Map(); // guildId -> Promise chain

async function queueSpawnWrite(guildId, operation) {
    // Get or create the queue for this guild
    if (!spawnWriteQueues.has(guildId)) {
        spawnWriteQueues.set(guildId, Promise.resolve());
    }
    
    // Chain this operation to the queue
    const queue = spawnWriteQueues.get(guildId);
    const newQueue = queue.then(async () => {
        console.log(`[SPAWN-QUEUE] Processing spawn write for guild ${guildId}`);
        return await operation();
    }).catch(err => {
        console.error(`[SPAWN-QUEUE] Error in queued operation for guild ${guildId}:`, err.message);
        throw err;
    });
    
    spawnWriteQueues.set(guildId, newQueue);
    return newQueue;
}

// Patch Discord.js v13 for Node.js 24 compatibility
const discord = require('discord.js');
const BaseChannel = discord.BaseChannel || discord.Channel;
if (BaseChannel && !BaseChannel.prototype.isText) {
    BaseChannel.prototype.isText = function() {
        return ['GUILD_TEXT', 'DM', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(this.type);
    };
    console.log('[PATCH] Applied isText() patch to Discord.js Channel');
}

const KILLFEED_CHANNEL_ID = '1404256735245373511'; // Discord channel for Killfeed (legacy)
let lastSeenKillfeedLogLine = '';
let multiGuildKillfeed = null; // Will be initialized on bot ready

function parseKillfeedLogEvents(logText) {
    const lines = logText.split(/\r?\n/);
    const events = [];
    for (const line of lines) {
        if (line.includes('transporthit')) continue; // Ignore vehicle hits
        let match;
        if (line.includes('killed by')) {
            // Example: 12:34:56 | Player "A"(id=123) killed by Player "B"(id=456) with M4A1
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) killed by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
            if (match) {
                events.push({ type: 'kill', time: match[1], victim: match[2], killer: match[3], weapon: match[4], raw: line });
            } else {
                events.push({ type: 'kill', time: '', victim: '', killer: '', weapon: '', raw: line });
            }
        } else if (line.includes('hit by')) {
            // Example: 12:34:56 | Player "A"(id=123) hit by Player "B"(id=456) with M4A1
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) hit by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
            if (match) {
                events.push({ type: 'hit', time: match[1], victim: match[2], attacker: match[3], weapon: match[4], raw: line });
            } else {
                events.push({ type: 'hit', time: '', victim: '', attacker: '', weapon: '', raw: line });
            }
        }
    }
    return events;
}

async function postKillfeedLogEventToDiscord(event) {
    try {
        const { MessageEmbed } = require('discord.js');
        const channel = await bot.channels.fetch(KILLFEED_CHANNEL_ID);
        if (!channel) return;
        let embed = new MessageEmbed()
            .setColor(event.type === 'kill' ? '#ff0000' : '#ffaa00')
            .setTimestamp();
        if (event.type === 'kill') {
            if (event.killer && event.victim && event.weapon) {
                embed.setTitle('☠️ Killfeed')
                    .setDescription(`**${event.killer}** killed **${event.victim}**`)
                    .addField('Weapon', event.weapon, true)
                    .addField('Time', event.time, true);
            } else {
                embed.setTitle('☠️ Killfeed').setDescription(event.raw);
            }
        } else if (event.type === 'hit') {
            if (event.attacker && event.victim && event.weapon) {
                embed.setTitle('💥 Hitfeed')
                    .setDescription(`**${event.attacker}** hit **${event.victim}**`)
                    .addField('Weapon', event.weapon, true)
                    .addField('Time', event.time, true);
            } else {
                embed.setTitle('💥 Hitfeed').setDescription(event.raw);
            }
        }
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Failed to post killfeed-log to Discord:', err.message);
    }
}

// Main: Poll log every 120 seconds for killfeed
async function pollDayZLogForKillfeed() {
    try {
        const { filename, url } = await fetchMostRecentDayZLog();
        const resp = await axios.get(url);
        const logText = resp.data;
        
        // Parse player locations from log
        const lines = logText.split(/\r?\n/);
        let locationCount = 0;
        const guildId = '1392564838925914142'; // Default guild
        for (const line of lines) {
            const locInfo = parsePlayerLocation(line);
            if (locInfo) {
                updatePlayerLocation(guildId, locInfo.name, locInfo.position);
                locationCount++;
            }
        }
        if (locationCount > 0) {
            console.log(`[LOCATION] Updated ${locationCount} player locations`);
        }
        
        const events = parseKillfeedLogEvents(logText);
        // Only post new events since last poll
        let newEvents = events;
        if (lastSeenKillfeedLogLine) {
            const idx = events.findIndex(e => e.raw === lastSeenKillfeedLogLine);
            if (idx !== -1) newEvents = events.slice(idx + 1);
        }
        for (const event of newEvents) {
            await postKillfeedLogEventToDiscord(event);
        }
        if (events.length > 0) lastSeenKillfeedLogLine = events[events.length - 1].raw;
    } catch (err) {
        console.error('Error polling DayZ killfeed-log:', err.message);
    }
}
// --- Suicide-Log Channel Monitor ---
const SUICIDE_LOG_CHANNEL_ID = '1414744890813845645'; // Discord channel for suicide-log
let lastSeenSuicideLogLine = '';

function parseSuicideLogEvents(logText) {
    const lines = logText.split(/\r?\n/);
    const events = [];
    for (const line of lines) {
        if (line.includes('committed suicide')) {
            // Example: 12:34:56 | Player "Majik"(id=123) committed suicide
            const match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) committed suicide/);
            if (match) {
                events.push({ time: match[1], player: match[2], raw: line });
            } else {
                // fallback: just post the line
                events.push({ time: '', player: '', raw: line });
            }
        }
    }
    return events;
}

async function postSuicideLogEventToDiscord(event) {
    try {
        const { MessageEmbed } = require('discord.js');
        const channel = await bot.channels.fetch(SUICIDE_LOG_CHANNEL_ID);
        if (!channel) return;
        let embed = new MessageEmbed()
            .setColor('#a259a2')
            .setTitle('💀 Suicide Log')
            .setTimestamp();
        if (event.player) embed.setDescription(`**${event.player}** committed suicide.`);
        else embed.setDescription(event.raw);
        if (event.time) embed.addField('Time', event.time, true);
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Failed to post suicide-log to Discord:', err.message);
    }
}

// Main: Poll log every 120 seconds for suicide-log
async function pollDayZLogForSuicides() {
    try {
        const { filename, url } = await fetchMostRecentDayZLog();
        const resp = await axios.get(url);
        const logText = resp.data;
        const events = parseSuicideLogEvents(logText);
        // Only post new events since last poll
        let newEvents = events;
        if (lastSeenSuicideLogLine) {
            const idx = events.findIndex(e => e.raw === lastSeenSuicideLogLine);
            if (idx !== -1) newEvents = events.slice(idx + 1);
        }
        for (const event of newEvents) {
            await postSuicideLogEventToDiscord(event);
        }
        if (events.length > 0) lastSeenSuicideLogLine = events[events.length - 1].raw;
    } catch (err) {
        console.error('Error polling DayZ suicide-log:', err.message);
    }
}
// --- Build-Log Channel Monitor ---
const BUILD_LOG_CHANNEL_ID = '1414742322192846972'; // Discord channel for build-log
let lastSeenBuildLogLine = '';

function parseBuildLogEvents(logText) {
    const lines = logText.split(/\r?\n/);
    const events = [];
    for (const line of lines) {
        if (line.includes('placed')) {
            // Example: 12:34:56 | Player "Majik"(id=123) placed ObjectName at [x,y,z]
            const match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) placed (.+)$/);
            if (match) {
                events.push({ time: match[1], player: match[2], details: match[3], raw: line });
            } else {
                // fallback: just post the line
                events.push({ time: '', player: '', details: line, raw: line });
            }
        }
    }
    return events;
}

async function postBuildLogEventToDiscord(event) {
    try {
        const { MessageEmbed } = require('discord.js');
        const channel = await bot.channels.fetch(BUILD_LOG_CHANNEL_ID);
        if (!channel) return;
        let embed = new MessageEmbed()
            .setColor('#7289da')
            .setTitle('🏗️ Build Log')
            .setDescription(event.details)
            .setTimestamp();
        if (event.player) embed.addField('Player', event.player, true);
        if (event.time) embed.addField('Time', event.time, true);
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Failed to post build-log to Discord:', err.message);
    }
}

// Main: Poll log every 120 seconds for build-log
async function pollDayZLogForBuilds() {
    try {
        const { filename, url } = await fetchMostRecentDayZLog();
        const resp = await axios.get(url);
        const logText = resp.data;
        const events = parseBuildLogEvents(logText);
        // Only post new events since last poll
        let newEvents = events;
        if (lastSeenBuildLogLine) {
            const idx = events.findIndex(e => e.raw === lastSeenBuildLogLine);
            if (idx !== -1) newEvents = events.slice(idx + 1);
        }
        for (const event of newEvents) {
            await postBuildLogEventToDiscord(event);
        }
        if (events.length > 0) lastSeenBuildLogLine = events[events.length - 1].raw;
    } catch (err) {
        console.error('Error polling DayZ build-log:', err.message);
    }
}
// ...existing code...
// Fetch the most recent DayZServer log file from Nitrado
async function fetchMostRecentDayZLog() {
    try {
        // Step 1: List all files in the directory
    // ...existing code...
        const axios = require('axios');
    const dirPath = `/games/${config.ID2}/noftp/dayzps/config/`;
    const listUrl = `https://api.nitrado.net/services/${config.ID1}/gameservers/file_server/list?dir=${encodeURIComponent(dirPath)}`;
        const listResp = await axios.get(listUrl, {
            headers: { 'Authorization': `Bearer ${config.NITRATOKEN}` }
        });
        const files = listResp.data.data.entries || [];
        // Step 2: Filter for DayZServer log files
        const logFiles = files.filter(f => f.name.startsWith('DayZServer_PS4_x64_') && f.name.endsWith('.ADM'));
        if (logFiles.length === 0) throw new Error('No DayZServer log files found.');
        // Step 3: Sort by date in filename (descending)
        logFiles.sort((a, b) => b.name.localeCompare(a.name));
        const mostRecent = logFiles[0];
        // Step 4: Download the most recent log file
        const downloadUrl = `https://api.nitrado.net/services/${config.ID1}/gameservers/file_server/download?file=${encodeURIComponent(dirPath + mostRecent.name)}`;
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${config.NITRATOKEN}` }
        });
        // The download URL is in downloadResp.data.data.token.url
        return {
            filename: mostRecent.name,
            url: downloadResp.data.data.token.url
        };
    } catch (error) {
        console.error('Error fetching most recent DayZ log:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports.fetchMostRecentDayZLog = fetchMostRecentDayZLog;

// Function to add a spawn entry to spawn.json on Nitrado server
async function addCupidSpawnEntry(spawnEntry, guildId) {
    // Queue this operation to prevent concurrent writes to spawn.json
    return queueSpawnWrite(guildId, async () => {
        return await addCupidSpawnEntryInternal(spawnEntry, guildId);
    });
}

async function addCupidSpawnEntryInternal(spawnEntry, guildId) {
    // Get guild configuration
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        throw new Error('Guild not configured. Please run /admin killfeed setup first.');
    }
    
    const platformPath = getPlatformPath(guildConfig.platform);
    const FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
    const FTP_FILE_PATH = `/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
    const GAMEPLAY_FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
    const GAMEPLAY_FTP_PATH = `/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
    const BASE_URL = 'https://api.nitrado.net/services';
    
    try {
        console.log('[SPAWN] Adding spawn entry to spawn.json:', spawnEntry);
        
        // Step 1: Load spawn templates from spawn.json
        let spawnTemplates = {};
        let defaultTemplate = { pos: [0, 0, 0], ypr: [0, 0, 0], scale: 1, enableCEPersistency: 0 };
        
        try {
            const spawnConfigPath = path.join(__dirname, 'spawn.json');
            if (fs.existsSync(spawnConfigPath)) {
                const spawnConfig = JSON.parse(fs.readFileSync(spawnConfigPath, 'utf8'));
                spawnTemplates = spawnConfig.spawnTemplates || {};
                defaultTemplate = spawnConfig.defaultSpawnTemplate || defaultTemplate;
                console.log('[SPAWN] Loaded spawn templates from spawn.json');
            } else {
                console.log('[SPAWN] spawn.json not found, using default template');
            }
        } catch (err) {
            console.error('[SPAWN] Error loading spawn.json:', err.message);
        }
        
        // Step 2: Download current spawn.json from Nitrado
        let spawnJson = { Objects: [] };
        try {
            const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(FILE_PATH)}`;
            const downloadResp = await axios.get(downloadUrl, {
                headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
            });
            
            const fileUrl = downloadResp.data.data.token.url;
            const fileResp = await axios.get(fileUrl);
            
            if (fileResp.data && Array.isArray(fileResp.data.Objects)) {
                spawnJson = { Objects: fileResp.data.Objects };
            } else if (fileResp.data && Array.isArray(fileResp.data)) {
                spawnJson = { Objects: fileResp.data };
            } else {
                console.log('[SPAWN] spawn.json not found or empty, creating new one');
            }
        } catch (downloadErr) {
            console.log('[SPAWN] Could not download spawn.json, will create new:', downloadErr.message);
        }
        
        // Step 3: Get spawn template for this item class
        const template = spawnTemplates[spawnEntry.class] || { ...defaultTemplate, name: spawnEntry.class };
        const itemYOffset = (template.pos && template.pos[1]) || 0.55; // Default to +0.55 for standing items on table surface
        
        // Step 3.5: Get player's current location from database
        let playerLocation = null;
        if (spawnEntry.dayzPlayerName) {
            console.log(`[SPAWN] Looking up location for: "${spawnEntry.dayzPlayerName}"`);
            playerLocation = await db.getPlayerLocation(guildId, spawnEntry.dayzPlayerName);
            if (playerLocation) {
                console.log(`[SPAWN] Found location for ${spawnEntry.dayzPlayerName}: [${playerLocation.x}, ${playerLocation.z}, ${playerLocation.y}]`);
            } else {
                const errorMsg = `No location found for ${spawnEntry.dayzPlayerName}. Player must be tracked in-game before purchasing.`;
                console.error(`[SPAWN] ${errorMsg}`);
                throw new Error(errorMsg);
            }
        } else {
            const errorMsg = 'No dayzPlayerName provided in spawn entry';
            console.error(`[SPAWN] ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
        // Step 4: Check if there's a table near player's current location (within 5 meters)
        // Database stores: x, y, z where y is elevation (saved by multi_guild_killfeed)
        // spawn.json needs: [x, y, z] where y is elevation
        const playerX = playerLocation.x;
        const playerY = playerLocation.y; // Y is elevation
        const playerZ = playerLocation.z; // Z is horizontal
        
        let nearbyTable = null;
        for (const obj of spawnJson.Objects) {
            if (obj.name === 'StaticObj_Furniture_lobby_table') {
                const distance = Math.sqrt(
                    Math.pow(obj.pos[0] - playerX, 2) + 
                    Math.pow(obj.pos[2] - playerZ, 2) // Use X and Z for horizontal distance
                );
                
                if (distance < 20) { // Within 20 meters
                    nearbyTable = obj;
                    console.log(`[SPAWN] Found nearby table at [${obj.pos[0]}, ${obj.pos[1]}, ${obj.pos[2]}], distance: ${distance.toFixed(2)}m`);
                    break;
                }
            }
        }
        
        let tablePos = [playerX, playerY, playerZ];
        let itemCount = 0;
        
        if (!nearbyTable) {
            // Create new table at player's current location
            console.log(`[SPAWN] Creating new table at player location [${playerX}, ${playerY}, ${playerZ}]`);
            
            const tableObject = {
                name: 'StaticObj_Furniture_lobby_table',
                pos: [playerX, playerY, playerZ],
                ypr: [90, 0, 0],
                scale: 1,
                enableCEPersistency: 0,
                customString: JSON.stringify({
                    owner: spawnEntry.dayzPlayerName,
                    created: Date.now(),
                    restart_id: spawnEntry.restart_id,
                    item_count: 0
                })
            };
            
            spawnJson.Objects.push(tableObject);
            nearbyTable = tableObject;
        } else {
            // Use existing nearby table
            tablePos = nearbyTable.pos;
            try {
                const tableData = JSON.parse(nearbyTable.customString);
                itemCount = tableData.item_count || 0;
                console.log(`[SPAWN] Using existing table, current items: ${itemCount}`);
            } catch (e) {
                console.log(`[SPAWN] Using existing table, couldn't parse item count`);
            }
        }
        
        // Step 5: Calculate grid position for item on table
        // Table is ~0.64 wide (X) and ~1.45 long (Z)
        // Start at corner: table_X - 0.3, table_Z - 0.7
        // Grid: 4 items per row, spacing: X+0.15, Z+0.3
        const itemsPerRow = 4;
        const row = Math.floor(itemCount / itemsPerRow);
        const col = itemCount % itemsPerRow;
        
        const gridStartX = tablePos[0] - 0.3;
        const gridStartZ = tablePos[2] - 0.7;
        const gridSpacingX = 0.15;
        const gridSpacingZ = 0.3;
        
        const itemX = gridStartX + (col * gridSpacingX);
        const itemY = tablePos[1] + itemYOffset; // Use template offset for proper height
        const itemZ = gridStartZ + (row * gridSpacingZ);
        
        console.log(`[SPAWN] Item grid position: row ${row}, col ${col} => [${itemX}, ${itemY}, ${itemZ}] (offset: ${itemYOffset})`);
        
        // Step 6: Create spawn object for item on table (no quantity - each purchase creates individual items)
        // Note: DayZ's JSON spawn format does NOT support attachments field - attachments must be spawned separately
        const spawnObject = {
            name: spawnEntry.class,
            pos: [itemX, itemY, itemZ],
            ypr: template.ypr || [0, 0, 0],
            scale: template.scale || 1,
            enableCEPersistency: template.enableCEPersistency || 0,
            customString: JSON.stringify({
                userId: spawnEntry.userId,
                dayzPlayerName: spawnEntry.dayzPlayerName,
                item: spawnEntry.item,
                timestamp: spawnEntry.timestamp,
                restart_id: spawnEntry.restart_id,
                purchaseId: spawnEntry.purchaseId || null
            })
        };
        
        spawnJson.Objects.push(spawnObject);
        console.log(`[SPAWN] Added ${spawnEntry.class} to table at [${itemX.toFixed(2)}, ${itemY.toFixed(2)}, ${itemZ.toFixed(2)}], total objects: ${spawnJson.Objects.length}`);
        
        // Log coordinates to purchase history
        if (spawnEntry.purchaseId) {
            try {
                await db.updatePurchaseSpawnAttempt(
                    spawnEntry.purchaseId,
                    true,
                    true,
                    null,
                    `[${itemX.toFixed(2)}, ${itemY.toFixed(2)}, ${itemZ.toFixed(2)}]`
                );
            } catch (err) {
                console.error('[SPAWN] Failed to update purchase history:', err.message);
            }
        }
        
        // Update item count in table's customString
        try {
            const tableData = JSON.parse(nearbyTable.customString);
            tableData.item_count = itemCount + 1;
            nearbyTable.customString = JSON.stringify(tableData);
            console.log(`[SPAWN] Updated table item count to ${tableData.item_count}`);
        } catch (e) {
            console.log(`[SPAWN] Couldn't update table item count`);
        }
        
        // Step 6: Get FTP credentials from Nitrado API
        console.log('[SPAWN] Getting FTP credentials...');
        const infoUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers`;
        const infoResp = await axios.get(infoUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
        const ftpHost = ftpCreds.hostname;
        const ftpUser = ftpCreds.username;
        const ftpPass = ftpCreds.password;
        const ftpPort = ftpCreds.port || 21;
        
        console.log(`[SPAWN] FTP: ${ftpUser}@${ftpHost}:${ftpPort}`);
        
        // Step 7: Upload via FTP
        const { Client } = require('basic-ftp');
        const client = new Client();
        client.ftp.verbose = false;
        
        try {
            await client.access({
                host: ftpHost,
                user: ftpUser,
                password: ftpPass,
                port: ftpPort,
                secure: false
            });
            
            console.log('[SPAWN] Connected to FTP');
            
            // Write to temp file and upload spawn.json
            const tmpPath = path.join(__dirname, 'logs', `spawn_${Date.now()}.json`);
            fs.writeFileSync(tmpPath, JSON.stringify(spawnJson, null, 2), 'utf8');
            
            await client.uploadFrom(tmpPath, FTP_FILE_PATH);
            fs.unlinkSync(tmpPath);
            
            console.log('[SPAWN] Successfully uploaded spawn.json via FTP');
            
            // Step 8: Update cfggameplay.json to register spawn.json in objectSpawnersArr
            console.log('[SPAWN] Updating cfggameplay.json to register spawn.json...');
            
            try {
                // Download cfggameplay.json as text to preserve formatting
                const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(GAMEPLAY_FILE_PATH)}`;
                const downloadResp = await axios.get(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
                });
                
                const fileUrl = downloadResp.data.data.token.url;
                const fileResp = await axios.get(fileUrl, { responseType: 'text' });
                let fileContent = fileResp.data;
                
                // Check if spawn.json is already registered
                const spawnJsonPath = '"./custom/spawn.json"';
                
                if (!fileContent.includes(spawnJsonPath)) {
                    // Find empty objectSpawnersArr and add spawn.json to it using text replacement
                    // This preserves the original file formatting and location
                    const updatedContent = fileContent.replace(
                        /"objectSpawnersArr"\s*:\s*\[\s*\]/,
                        `"objectSpawnersArr": [\n        "./custom/spawn.json"\n    ]`
                    );
                    
                    if (updatedContent !== fileContent) {
                        fileContent = updatedContent;
                        console.log('[SPAWN] Added "./custom/spawn.json" to objectSpawnersArr');
                        
                        // Upload updated cfggameplay.json
                        const gameplayTmpPath = path.join(__dirname, 'logs', `cfggameplay_${Date.now()}.json`);
                        fs.writeFileSync(gameplayTmpPath, fileContent, 'utf8');
                        
                        await client.uploadFrom(gameplayTmpPath, GAMEPLAY_FTP_PATH);
                        fs.unlinkSync(gameplayTmpPath);
                        
                        console.log('[SPAWN] Successfully updated cfggameplay.json');
                    } else {
                        console.log('[SPAWN] Could not find empty objectSpawnersArr to update');
                    }
                } else {
                    console.log('[SPAWN] "./custom/spawn.json" already registered in objectSpawnersArr');
                }
            } catch (gameplayErr) {
                console.error('[SPAWN] Warning: Could not update cfggameplay.json:', gameplayErr.message);
                console.error('[SPAWN] Full error:', gameplayErr);
                console.error('[SPAWN] Stack:', gameplayErr.stack);
                console.error('[SPAWN] You may need to manually add "./custom/spawn.json" to objectSpawnersArr');
            }
            
        } finally {
            client.close();
        }
        
    } catch (err) {
        console.error('[SPAWN] Error adding spawn entry:', err.response ? err.response.data : err.message);
        throw err;
    }
}

// Function to spawn weapon kits from kit_purchases table
async function spawnPendingKits(guildId) {
    try {
        console.log('[KIT] Checking for pending kits to spawn...');
        const weaponKits = require('./weapon_kits.js');
        
        // Get all unspawned kits for this guild
        const kits = await db.pool.query(
            'SELECT * FROM kit_purchases WHERE guild_id = $1 AND spawned = false',
            [guildId]
        );

        if (kits.rows.length === 0) {
            console.log('[KIT] No pending kits to spawn');
            return;
        }

        console.log(`[KIT] Found ${kits.rows.length} kits to spawn`);

        for (const kit of kits.rows) {
            try {
                console.log(`[KIT] Spawning ${kit.kit_name} for user ${kit.user_id}`);
                
                // Get player's DayZ name
                const dayzName = await db.getDayZName(guildId, kit.user_id);
                if (!dayzName) {
                    console.log(`[KIT] No DayZ name found for ${kit.user_id}, skipping`);
                    continue;
                }

                // Spawn the weapon
                await addCupidSpawnEntry({
                    class: kit.weapon_variant,
                    userId: kit.user_id,
                    dayzPlayerName: dayzName
                }, guildId);

                // Spawn all attachments
                const attachments = JSON.parse(kit.attachments);
                for (const [slotName, className] of Object.entries(attachments)) {
                    await addCupidSpawnEntry({
                        class: className,
                        userId: kit.user_id,
                        dayzPlayerName: dayzName
                    }, guildId);
                }

                // Mark as spawned
                await db.markKitSpawned(kit.id);
                console.log(`[KIT] Successfully spawned kit #${kit.id}`);

            } catch (kitError) {
                console.error(`[KIT] Error spawning kit #${kit.id}:`, kitError.message);
            }
        }

    } catch (error) {
        console.error('[KIT] Error in spawnPendingKits:', error);
    }
}

module.exports.addCupidSpawnEntry = addCupidSpawnEntry;
module.exports.spawnPendingKits = spawnPendingKits;

// --- Player Location Tracking ---
function parsePlayerLocation(logEntry) {
    const regex = /(\d{2}:\d{2}:\d{2}) \| Player "(.+?)" \(id=(.+?) pos=<(.+?), (.+?), (.+?)>\)/;
    const match = logEntry.match(regex);
    if (match) {
        return {
            timestamp: match[1],
            name: match[2],
            playerId: match[3],
            position: {
                x: parseFloat(match[4]),
                y: parseFloat(match[5]),
                z: parseFloat(match[6])
            }
        };
    }
    return null;
}

async function updatePlayerLocation(guildId, playerName, position) {
    try {
        await db.setPlayerLocation(guildId, playerName, position.x, position.y, position.z);
    } catch (err) {
        console.error('[LOCATION] Error saving location:', err.message);
    }
}

// getPlayerLocation is now accessed via database in economy.js

/* DayZero KillFeed (DZK) DIY Project 2.1
Copyright (c) 2023 TheCodeGang LLC.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

require('dotenv').config();
const { Client, Collection, Intents } = require('discord.js');
const configFile = fs.existsSync('./config.json') ? require('./config.json') : {};
const moment = require('moment-timezone');
const nodeoutlook = require('nodejs-nodemailer-outlook');

// Merge config: Use .env for local dev, config.json for production (Heroku)
const config = {
    TOKEN: process.env.TOKEN || configFile.TOKEN,
    CLIENTID: process.env.CLIENTID || configFile.CLIENTID,
    GUILDID: process.env.GUILDID || configFile.GUILDID,
    PLATFORM: process.env.PLATFORM || configFile.PLATFORM,
    ID1: process.env.ID1 || configFile.ID1,
    ID2: process.env.ID2 || configFile.ID2,
    NITRATOKEN: process.env.NITRATOKEN || configFile.NITRATOKEN,
    REGION: process.env.REGION || configFile.REGION,
    DEV_MODE: process.env.DEV_MODE === 'true',
    TEST_GUILD_ID: process.env.TEST_GUILD_ID
};

console.log(`[CONFIG] Running in ${config.DEV_MODE ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);

if (!fs.existsSync("./logs/log.ADM")) {
    fs.writeFileSync("./logs/log.ADM", "");
}
if (!fs.existsSync("./logs/serverlog.ADM")) {
    fs.writeFileSync("./logs/serverlog.ADM", "");
}

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ]
});

let servCheck = config.GUILDID;

// Setup Slash Command Handler
bot.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        // Support both single and array of slash commands (for economy.js)
        if (Array.isArray(command.data)) {
            // Store the module itself using the filename (without .js) for accessing methods like handleCampaignChoice
            const moduleName = file.replace('.js', '');
            bot.commands.set(moduleName, command);
            
            // Also register each individual command
            for (const cmd of command.data) {
                if (cmd && cmd.name) {
                    bot.commands.set(cmd.name, { ...command, data: cmd });
                }
            }
        } else if (command && command.data && command.data.name) {
            bot.commands.set(command.data.name, command);
        } else {
            console.warn(`No commands detected in file: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error loading command file ${filePath}:`, error);
    }
}

async function handleRaidScheduleSubmit(interaction) {
    try {
        const { MessageEmbed } = require('discord.js');
        const guildId = interaction.guildId;
        
        // Get values from modal
        const startDay = parseInt(interaction.fields.getTextInputValue('start_day'));
        const startTime = interaction.fields.getTextInputValue('start_time').trim();
        const endDay = parseInt(interaction.fields.getTextInputValue('end_day'));
        const endTime = interaction.fields.getTextInputValue('end_time').trim();
        const timezone = interaction.fields.getTextInputValue('timezone').trim();
        
        // Validate inputs
        if (startDay < 0 || startDay > 6 || endDay < 0 || endDay > 6) {
            return interaction.reply({
                content: '❌ Invalid day! Days must be between 0 (Sunday) and 6 (Saturday).',
                ephemeral: true
            });
        }
        
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return interaction.reply({
                content: '❌ Invalid time format! Use HH:MM format (e.g., 18:00).',
                ephemeral: true
            });
        }
        
        await interaction.deferReply();
        
        // Update database
        await db.query(`
            UPDATE guild_configs 
            SET raid_schedule_enabled = $1,
                raid_start_day = $2,
                raid_start_time = $3,
                raid_end_day = $4,
                raid_end_time = $5,
                raid_timezone = $6
            WHERE guild_id = $7
        `, [true, startDay, startTime, endDay, endTime, timezone, guildId]);
        
        console.log(`[RAID SCHEDULE] Configured for guild ${guildId}:`, {
            startDay, startTime, endDay, endTime, timezone
        });
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const embed = new MessageEmbed()
            .setColor('#00ff00')
            .setTitle('✅ Automatic Raid Weekend Scheduled!')
            .setDescription('Your automatic raid weekend schedule has been configured!')
            .addField('📅 Start', `${dayNames[startDay]} at ${startTime}`, true)
            .addField('📅 End', `${dayNames[endDay]} at ${endTime}`, true)
            .addField('🌍 Timezone', timezone, false)
            .addField(
                '⚙️ How It Works',
                '• The bot will automatically enable raiding at the start time\n' +
                '• Raiding will be disabled at the end time\n' +
                '• An @everyone announcement will be posted each time\n' +
                '• Checked every 5 minutes\n' +
                '• Server restart required for changes to take effect',
                false
            )
            .setFooter({ text: 'Use /admin killfeed raiding status to view current schedule' });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[RAID SCHEDULE SUBMIT] Error:', error);
        await interaction.reply({
            content: `❌ Failed to save schedule: ${error.message}`,
            ephemeral: true
        }).catch(() => {});
    }
}

async function handleTraderOpenSubmit(interaction) {
    try {
        const { MessageEmbed } = require('discord.js');
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        
        // Get values from modal
        const location = interaction.fields.getTextInputValue('location').trim();
        const hours = interaction.fields.getTextInputValue('hours').trim();
        
        // Validate location format (should be like "6900.87 / 11430.08")
        const locationRegex = /^\d+\.?\d*\s*\/\s*\d+\.?\d*$/;
        if (!locationRegex.test(location)) {
            return interaction.reply({
                content: '❌ Invalid location format! Use iZurvive coordinates like: `6900.87 / 11430.08`',
                ephemeral: true
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        // Insert into database
        await db.query(`
            INSERT INTO active_traders (guild_id, user_id, location, hours_open)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (guild_id, user_id) 
            DO UPDATE SET location = $3, hours_open = $4, opened_at = CURRENT_TIMESTAMP
        `, [guildId, userId, location, hours]);
        
        console.log(`[TRADER] ${interaction.user.tag} opened trader at ${location}`);
        
        // Send @everyone announcement to general channel
        const generalChannel = interaction.guild.channels.cache.find(
            channel => channel.name.toLowerCase().includes('general') && channel.type === 'GUILD_TEXT'
        );
        
        if (generalChannel) {
            const announceEmbed = new MessageEmbed()
                .setColor('#00ff00')
                .setTitle('🛒 TRADER NOW OPEN!')
                .setDescription(`**${interaction.user.username}** has opened their trader!`)
                .addFields(
                    { name: '📍 Location', value: location, inline: true },
                    { name: '⏰ Hours', value: hours, inline: true }
                )
                .setFooter({ text: 'Use /admin killfeed trader to see all active traders!' })
                .setTimestamp();
            
            await generalChannel.send({ content: '@everyone', embeds: [announceEmbed] });
        }
        
        const confirmEmbed = new MessageEmbed()
            .setColor('#00ff00')
            .setTitle('✅ Trader Opened Successfully!')
            .setDescription('Your trader is now active and an announcement has been sent!')
            .addFields(
                { name: '📍 Location', value: location, inline: true },
                { name: '⏰ Hours', value: hours, inline: true }
            )
            .setFooter({ text: 'Use /admin killfeed trader → Close Trader when done' });
        
        await interaction.editReply({ embeds: [confirmEmbed] });
        
    } catch (error) {
        console.error('[TRADER OPEN SUBMIT] Error:', error);
        await interaction.reply({
            content: `❌ Failed to open trader: ${error.message}`,
            ephemeral: true
        }).catch(() => {});
    }
}

bot.on('interactionCreate', async interaction => {
    const startTime = Date.now();
    console.log('[INTERACTION] Received:', interaction.type, interaction.commandName || interaction.customId, 'at', startTime);
    
    // PRIORITY: Handle commands FIRST to minimize processing delay
    if (interaction.isCommand()) {
        const command = bot.commands.get(interaction.commandName);
        if (!command) return;

        try {
            console.log(`[INTERACTION] Executing command: ${interaction.commandName}`);
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const content = 'There was an error while executing this command!';
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content });
                } else {
                    await interaction.reply({ content, ephemeral: true });
                }
            } catch (replyError) {
                console.error('[INTERACTION] Could not send error message:', replyError.message);
            }
        }
        return; // Exit early for commands
    }
    
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'guild_setup_modal') {
            const adminCommand = bot.commands.get('admin');
            if (adminCommand && adminCommand.handleSetupModalSubmit) {
                await adminCommand.handleSetupModalSubmit(interaction);
            }
        } else if (interaction.customId === 'raid_schedule_modal') {
            await handleRaidScheduleSubmit(interaction);
        } else if (interaction.customId === 'trader_open_modal') {
            await handleTraderOpenSubmit(interaction);
        } else if (interaction.customId === 'zone_name_modal') {
            const teleportCommand = require('./commands/teleport.js');
            if (teleportCommand.handleZoneNameModal) {
                await teleportCommand.handleZoneNameModal(interaction);
            }
        } else if (interaction.customId.startsWith('zone_coords_modal|')) {
            const teleportCommand = require('./commands/teleport.js');
            if (teleportCommand.handleZoneCoordsModal) {
                await teleportCommand.handleZoneCoordsModal(interaction);
            }
        } else if (interaction.customId.startsWith('teleport_')) {
            const teleportCommand = require('./commands/teleport.js');
            if (teleportCommand.handleModalSubmit) {
                await teleportCommand.handleModalSubmit(interaction);
            }
        }
        return;
    }
    
    // Handle select menu interactions for teleport
    if (interaction.isSelectMenu() && interaction.customId.startsWith('teleport_')) {
        const teleportCommand = require('./commands/teleport.js');
        if (teleportCommand.handleSelectMenu) {
            await teleportCommand.handleSelectMenu(interaction);
        }
        return;
    }
    
    // Handle button interactions for teleport
    if (interaction.isButton() && (interaction.customId.startsWith('manual_coords|') || interaction.customId.startsWith('manual_zone_coords|') || interaction.customId === 'cancel_route' || interaction.customId === 'cancel_zone')) {
        const teleportCommand = require('./commands/teleport.js');
        if (teleportCommand.handleButton) {
            await teleportCommand.handleButton(interaction);
        }
        return;
    }
    
    // Handle kit system interactions
    if ((interaction.isButton() || interaction.isSelectMenu()) && interaction.customId.startsWith('kit_')) {
        const kitCommand = bot.commands.get('kit');
        if (!kitCommand) return;

        try {
            if (interaction.customId.startsWith('kit_weapon_')) {
                await kitCommand.handleWeaponSelection(interaction);
            } else if (interaction.customId.startsWith('kit_variant_')) {
                await kitCommand.handleVariantSelection(interaction);
            } else if (interaction.customId.startsWith('kit_attach_')) {
                await kitCommand.handleAttachmentSelection(interaction);
            } else if (interaction.customId.startsWith('kit_finish_')) {
                await kitCommand.handleFinishKit(interaction);
            } else if (interaction.customId.startsWith('kit_cancel_')) {
                await kitCommand.handleCancelKit(interaction);
            }
        } catch (error) {
            console.error('[KIT] Error handling interaction:', error);
            await interaction.reply({ content: '❌ An error occurred! Please try again.', ephemeral: true }).catch(() => {});
        }
        return;
    }
    
    // Handle campaign button interactions
    if (interaction.isButton() && interaction.customId.startsWith('campaign_')) {
        console.log('[CAMPAIGN] Button clicked:', interaction.customId);
        const economyCommand = bot.commands.get('economy');
        console.log('[CAMPAIGN] Economy command found:', !!economyCommand);
        console.log('[CAMPAIGN] Has handleCampaignChoice:', !!economyCommand?.handleCampaignChoice);
        console.log('[CAMPAIGN] Economy exports:', Object.keys(economyCommand || {}));
        
        if (economyCommand && economyCommand.handleCampaignChoice) {
            try {
                await economyCommand.handleCampaignChoice(interaction);
            } catch (error) {
                console.error('[CAMPAIGN] Error handling choice:', error);
                await interaction.reply({ content: '❌ An error occurred! Please try again.', ephemeral: true });
            }
        } else {
            console.error('[CAMPAIGN] Handler not found!');
        }
        return;
    }
});

// Message Command Handler
bot.on('messageCreate', async message => {
    if (!message.guild || !message.author || !message.member) return;
    if (message.author.bot) return;

    const guildId = message.guild.id;
    if (servCheck != guildId) return;

    const adminRole = message.guild.roles.cache.find(r => r.name === 'Admin');
    const everyoneRole = message.guild.roles.everyone;

    if (!adminRole || !everyoneRole) return;

    const adminRoleId = adminRole.id;
    const everyoneRoleId = everyoneRole.id;
});

// Login Discord Bot
bot.login(config.TOKEN).catch(error => {
    console.log(error);
});

bot.on('ready', async () => {
    console.info(`Logged in as ${bot.user.tag}!`);
    console.log('KILLFEED IS ACTIVE!');
    
    // Start multi-guild killfeed monitoring
    if (!multiGuildKillfeed) {
        multiGuildKillfeed = new MultiGuildKillfeed(bot);
        multiGuildKillfeed.start();
    }
    
    // ONE-TIME SHOP ANNOUNCEMENT: Send shop table update to all servers
    if (process.env.SEND_SHOP_ANNOUNCEMENT === 'true') {
        console.log('[ANNOUNCEMENT] Sending shop table announcement to all servers...');
        setTimeout(async () => {
            try {
                const guilds = await db.getAllGuildConfigs();
                console.log(`[ANNOUNCEMENT] Found ${guilds.length} configured guilds`);
                
                for (const guildConfig of guilds) {
                    try {
                        const guild = await bot.guilds.fetch(guildConfig.guild_id);
                        
                        const generalChannel = guild.channels.cache.find(ch => 
                            ch.name.toLowerCase().includes('general') || 
                            ch.name.toLowerCase().includes('announcement') ||
                            ch.name === 'wop-general'
                        );
                        
                        if (!generalChannel) {
                            console.log(`⚠️  No general channel found for guild ${guild.name}`);
                            continue;
                        }
                        
                        const { MessageEmbed } = require('discord.js');
                        const embed = new MessageEmbed()
                            .setColor('#FFD700')
                            .setTitle('⚡ **DIVINE PROCLAMATION FROM THE HEAVENS** ⚡')
                            .setDescription(
                                `@everyone\n\n` +
                                `**HEAR YE, WARRIORS OF THE WASTELAND!**\n\n` +
                                `*The gods have witnessed your struggles. They have heard your cries in the darkness. ` +
                                `And now, from the celestial forge of Olympus itself, a gift beyond mortal comprehension...*\n\n` +
                                `🏹 **CUPID'S DIVINE SHOP HAS TRANSCENDED!** 🏹`
                            )
                            .addFields(
                                {
                                    name: '✨ **THE MIRACLE OF THE SACRED TABLES** ✨',
                                    value: 
                                        `No longer shall your treasures scatter across the realm like fallen stars!\n\n` +
                                        `**Behold the power of divine manifestation:**\n` +
                                        `• Your purchased gear now **materializes on SACRED TABLES**\n` +
                                        `• Tables spawn **within 5 meters** of your hallowed position\n` +
                                        `• Multiple purchases? They **accumulate in glorious grids** upon a single altar\n` +
                                        `• The gods organize your spoils with **celestial precision**\n\n` +
                                        `*This is not mere commerce—this is DIVINE INTERVENTION!*`,
                                    inline: false
                                },
                                {
                                    name: '⚔️ **HOW TO INVOKE THE BLESSING** ⚔️',
                                    value:
                                        `**Step 1:** Use \`/imhere\` to mark your sacred ground\n` +
                                        `**Step 2:** Browse Cupid's arsenal with \`/shop\`\n` +
                                        `**Step 3:** Purchase your legendary gear\n` +
                                        `**Step 4:** Wait for the server's divine restart\n` +
                                        `**Step 5:** Witness the **LOBBY TABLE** manifest with your bounty!`,
                                    inline: false
                                },
                                {
                                    name: '🌟 **THE POWER YOU NOW COMMAND** 🌟',
                                    value:
                                        `📦 **406 LEGENDARY ITEMS** across 15 categories\n` +
                                        `🎯 **ASSAULT RIFLES • SNIPERS • SHOTGUNS**\n` +
                                        `🗡️ **MELEE WEAPONS • ATTACHMENTS • AMMUNITION**\n` +
                                        `💊 **MEDICAL SUPPLIES • FOOD & DRINK**\n` +
                                        `🎒 **CLOTHING • ARMOR • BACKPACKS**\n` +
                                        `🔧 **TOOLS • BUILDING • VEHICLES • ELECTRONICS**\n\n` +
                                        `*Every item meticulously catalogued. Every template perfected.*`,
                                    inline: false
                                },
                                {
                                    name: '💰 **EARN YOUR GLORY** 💰',
                                    value:
                                        `• **10 COINS PER KILL** - The blood price of power\n` +
                                        `• \`/balance\` - Witness your accumulated wealth\n` +
                                        `• \`/bank\` - Secure your fortune from death's grasp\n` +
                                        `• \`/leaderboard\` - See who stands among legends\n\n` +
                                        `*Every kill brings you closer to godhood!*`,
                                    inline: false
                                },
                                {
                                    name: '🔥 **THE SACRED RESTART TIMES** 🔥',
                                    value:
                                        `Your divine purchases manifest when the servers commune with the gods:\n\n` +
                                        `⏰ **3:00 AM** • **9:00 AM** • **3:00 PM** • **9:00 PM** UTC\n\n` +
                                        `*Patience, warrior. Even gods respect the cosmic cycle.*`,
                                    inline: false
                                },
                                {
                                    name: '⚡ **COMMAND THE DIVINE** ⚡',
                                    value:
                                        `\`/imhere\` - **CRITICAL!** Mark your position before all else\n` +
                                        `\`/shop\` - Behold 406 items of legend\n` +
                                        `\`/balance\` - Know your power\n` +
                                        `\`/deposit\` \`/withdraw\` - Master your fortune\n` +
                                        `\`/leaderboard\` - Witness greatness`,
                                    inline: false
                                }
                            )
                            .setFooter({ 
                                text: '🏹 By Cupid\'s arrow and Himeros\' fire, may your tables overflow with glory! 🔥'
                            })
                            .setTimestamp();
                        
                        await generalChannel.send({ embeds: [embed] });
                        console.log(`✅ Announcement sent to ${guild.name} (${generalChannel.name})`);
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (error) {
                        console.error(`❌ Error sending to guild ${guildConfig.guild_id}:`, error.message);
                    }
                }
                
                console.log('\n🎉 All shop announcements sent!');
                
            } catch (error) {
                console.error('❌ Fatal error in shop announcement:', error);
            }
        }, 5000); // Wait 5 seconds after bot is ready
    }
    
    // RAID WEEKEND SCHEDULER: Check every 5 minutes for automatic raid schedule triggers
    setInterval(async () => {
        try {
            const guilds = await db.getAllGuildConfigs();
            
            for (const guildConfig of guilds) {
                // Only process guilds with automatic scheduling enabled
                if (!guildConfig.raid_schedule_enabled) continue;
                
                // Skip if missing schedule data
                if (guildConfig.raid_start_day === null || !guildConfig.raid_start_time ||
                    guildConfig.raid_end_day === null || !guildConfig.raid_end_time) {
                    continue;
                }
                
                let timezone = guildConfig.raid_timezone || 'America/New_York';
                
                // Fix common timezone issues
                if (timezone === 'New_York') timezone = 'America/New_York';
                if (timezone === 'Los_Angeles') timezone = 'America/Los_Angeles';
                if (timezone === 'Chicago') timezone = 'America/Chicago';
                if (timezone === 'Denver') timezone = 'America/Denver';
                
                try {
                    // Get current time in guild's timezone with fallback
                    let currentDate;
                    try {
                        const now = new Date().toLocaleString('en-US', { timeZone: timezone });
                        currentDate = new Date(now);
                    } catch (tzError) {
                        console.error(`[RAID SCHEDULER] Invalid timezone for guild ${guildConfig.guild_id}, using UTC:`, timezone);
                        currentDate = new Date();
                    }
                    
                    const currentDay = currentDate.getDay();
                    const currentHours = currentDate.getHours();
                    const currentMinutes = currentDate.getMinutes();
                    
                    const isCurrentlyActive = guildConfig.raid_currently_active || false;
                    
                    // Helper to check if current time is within 5 minutes of target time
                    const isWithin5Minutes = (targetTime) => {
                        const [targetHour, targetMin] = targetTime.split(':').map(Number);
                        const currentTotalMinutes = currentHours * 60 + currentMinutes;
                        const targetTotalMinutes = targetHour * 60 + targetMin;
                        const diff = currentTotalMinutes - targetTotalMinutes;
                        // Check if we're within the current 5-minute window (0-4 minutes past target)
                        return diff >= 0 && diff < 5;
                    };
                    
                    // Check if it's time to START raiding
                    if (currentDay === guildConfig.raid_start_day && isWithin5Minutes(guildConfig.raid_start_time)) {
                        if (!isCurrentlyActive) {
                            console.log(`[RAID SCHEDULER] Triggering raid START for guild ${guildConfig.guild_id} at ${currentHours}:${String(currentMinutes).padStart(2, '0')}`);
                            await automaticRaidToggle(bot, guildConfig, true);
                        }
                    }
                    
                    // Check if it's time to END raiding
                    if (currentDay === guildConfig.raid_end_day && isWithin5Minutes(guildConfig.raid_end_time)) {
                        if (isCurrentlyActive) {
                            console.log(`[RAID SCHEDULER] Triggering raid END for guild ${guildConfig.guild_id} at ${currentHours}:${String(currentMinutes).padStart(2, '0')}`);
                            await automaticRaidToggle(bot, guildConfig, false);
                        }
                    }
                } catch (error) {
                    console.error(`[RAID SCHEDULER] Error processing guild ${guildConfig.guild_id}:`, error);
                }
            }
        } catch (error) {
            console.error('[RAID SCHEDULER] Fatal error:', error);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log('[RAID SCHEDULER] Automatic raid weekend scheduler started (5-minute interval)');
    
    // TOURNAMENT WINNER SCHEDULER: Pick winners daily at midnight
    setInterval(async () => {
        try {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            
            // Run at midnight (00:00 - 00:05)
            if (hours === 0 && minutes < 5) {
                console.log('[TOURNAMENT] Running daily tournament winner selection...');
                await selectTournamentWinners(bot);
            }
        } catch (error) {
            console.error('[TOURNAMENT] Error in scheduler:', error);
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    console.log('[TOURNAMENT] Daily tournament scheduler started');
});

async function selectTournamentWinners(bot) {
    const { MessageEmbed } = require('discord.js');
    
    try {
        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tournamentDate = yesterday.toISOString().split('T')[0];
        
        console.log(`[TOURNAMENT] Selecting winners for ${tournamentDate}`);
        
        // Get all guilds
        const guilds = await db.getAllGuildConfigs();
        
        for (const guildConfig of guilds) {
            try {
                // Get all entries for this guild from yesterday
                const entries = await db.query(
                    'SELECT user_id, entry_cost FROM tournament_entries WHERE guild_id = $1 AND entry_date = $2',
                    [guildConfig.guild_id, tournamentDate]
                );
                
                if (entries.rows.length === 0) {
                    console.log(`[TOURNAMENT] No entries for guild ${guildConfig.guild_id}`);
                    continue;
                }
                
                console.log(`[TOURNAMENT] Guild ${guildConfig.guild_id}: ${entries.rows.length} entries`);
                
                // Calculate prize pool
                const prizePool = entries.rows.reduce((sum, e) => sum + e.entry_cost, 0);
                
                // Select random winner
                const winnerEntry = entries.rows[Math.floor(Math.random() * entries.rows.length)];
                const winnerId = winnerEntry.user_id;
                
                // Award prize (3x entry fees as prize)
                const prize = prizePool * 3;
                await db.addBalance(guildConfig.guild_id, winnerId, prize);
                
                // Update stats
                const { updateUserStats } = require('./commands/economy.js');
                await updateUserStats(guildConfig.guild_id, winnerId, prize, true);
                
                // Post announcement
                const guild = await bot.guilds.fetch(guildConfig.guild_id);
                const generalChannel = guild.channels.cache.find(
                    ch => ch.name.includes('general') || ch.name.includes('General')
                );
                
                if (generalChannel) {
                    const embed = new MessageEmbed()
                        .setColor('#f39c12')
                        .setTitle('🏇 Jousting Tournament Results!')
                        .setDescription(`**Yesterday's Grand Tournament**`)
                        .addField('🏆 Champion', `<@${winnerId}>`, true)
                        .addField('💰 Prize', `$${prize}`, true)
                        .addField('👥 Participants', `${entries.rows.length} brave knights`, true)
                        .setFooter({ text: 'Use /joust to enter today\'s tournament!' })
                        .setTimestamp();
                    
                    await generalChannel.send({ embeds: [embed] });
                    console.log(`[TOURNAMENT] Announced winner in guild ${guildConfig.guild_id}`);
                }
                
                // Clean up old entries (older than 7 days)
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                await db.query(
                    'DELETE FROM tournament_entries WHERE guild_id = $1 AND entry_date < $2',
                    [guildConfig.guild_id, weekAgo.toISOString().split('T')[0]]
                );
                
            } catch (guildError) {
                console.error(`[TOURNAMENT] Error processing guild ${guildConfig.guild_id}:`, guildError);
            }
        }
        
        console.log('[TOURNAMENT] Winner selection complete');
    } catch (error) {
        console.error('[TOURNAMENT] Fatal error:', error);
    }
}

// Welcome new members
bot.on('guildMemberAdd', async (member) => {
    try {
        console.log(`[WELCOME] New member joined: ${member.user.tag} in guild ${member.guild.id}`);
        
        // Find general channel
        const generalChannel = member.guild.channels.cache.find(
            ch => ch.name.includes('general') || ch.name.includes('General')
        );
        
        if (generalChannel) {
            const { MessageEmbed } = require('discord.js');
            const embed = new MessageEmbed()
                .setColor('#00ff99')
                .setTitle('👋 Welcome to the Server!')
                .setDescription(`Welcome ${member}! We're glad to have you here!`)
                .addField('📋 Getting Started', 
                    '• Check out the server rules\n' +
                    '• Introduce yourself in this channel\n' +
                    '• Type `/shophelp` to learn about the shop system\n' +
                    '• Have fun and enjoy your stay!', 
                    false)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Member #${member.guild.memberCount}` })
                .setTimestamp();
            
            await generalChannel.send({ content: `${member}`, embeds: [embed] });
            console.log(`[WELCOME] Sent welcome message for ${member.user.tag}`);
        } else {
            console.log(`[WELCOME] No general channel found in guild ${member.guild.id}`);
        }
    } catch (error) {
        console.error('[WELCOME] Error sending welcome message:', error);
    }
});

async function automaticRaidToggle(bot, guildConfig, enableRaiding) {
    const axios = require('axios');
    const { Client: FTPClient } = require('basic-ftp');
    const path = require('path');
    const { MessageEmbed } = require('discord.js');
    
    try {
        console.log(`[AUTO RAID] ${enableRaiding ? 'Enabling' : 'Disabling'} raiding for guild ${guildConfig.guild_id}`);
        
        const platformPath = getPlatformPath(guildConfig.platform);
        const GAMEPLAY_FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
        const GAMEPLAY_FTP_PATH = `/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
        const BASE_URL = 'https://api.nitrado.net/services';
        
        // Download cfggameplay.json
        console.log('[AUTO RAID] Downloading cfggameplay.json...');
        const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(GAMEPLAY_FILE_PATH)}`;
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const fileUrl = downloadResp.data.data.token.url;
        const fileResp = await axios.get(fileUrl, { responseType: 'text' });
        let fileContent = fileResp.data;
        
        // Toggle raid settings (false = raiding enabled, true = raiding disabled)
        const disableValue = enableRaiding ? 'false' : 'true';
        
        fileContent = fileContent.replace(
            /"disableBaseDamage"\s*:\s*(true|false)/g,
            `"disableBaseDamage": ${disableValue}`
        );
        
        fileContent = fileContent.replace(
            /"disableContainerDamage"\s*:\s*(true|false)/g,
            `"disableContainerDamage": ${disableValue}`
        );
        
        console.log(`[AUTO RAID] Set damage flags to ${disableValue}`);
        
        // Get FTP credentials and upload
        const infoUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers`;
        const infoResp = await axios.get(infoUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
        const client = new FTPClient();
        client.ftp.verbose = false;
        
        try {
            await client.access({
                host: ftpCreds.hostname,
                user: ftpCreds.username,
                password: ftpCreds.password,
                port: ftpCreds.port || 21,
                secure: false
            });
            
            // Upload modified file
            const gameplayTmpPath = path.join(__dirname, 'logs', `cfggameplay_auto_raid_${Date.now()}.json`);
            fs.writeFileSync(gameplayTmpPath, fileContent, 'utf8');
            
            await client.uploadFrom(gameplayTmpPath, GAMEPLAY_FTP_PATH);
            fs.unlinkSync(gameplayTmpPath);
            
            console.log('[AUTO RAID] ✅ Successfully updated cfggameplay.json!');
            
            // Update database
            await db.query(
                'UPDATE guild_configs SET raid_currently_active = $1 WHERE guild_id = $2',
                [enableRaiding, guildConfig.guild_id]
            );
            
            // Send announcement to guild
            const guild = await bot.guilds.fetch(guildConfig.guild_id);
            
            // Find general channel or killfeed channel
            let announcementChannel = guild.channels.cache.find(
                ch => ch.name.includes('general') || ch.name.includes('General')
            );
            
            if (!announcementChannel && guildConfig.killfeed_channel_id) {
                announcementChannel = guild.channels.cache.get(guildConfig.killfeed_channel_id);
            }
            
            if (announcementChannel) {
                // Calculate countdown to opposite state
                const updatedConfig = { ...guildConfig, raid_currently_active: enableRaiding };
                const countdown = calculateRaidCountdown(updatedConfig);
                const nextRestart = guildConfig.restart_hours ? getNextRestartTime(guildConfig.restart_hours) : 'Unknown';
                
                const embed = new MessageEmbed()
                    .setColor(enableRaiding ? '#ff5555' : '#55ff55')
                    .setTitle(enableRaiding ? '⚔️ **RAID WEEKEND IS NOW ACTIVE!** ⚔️' : '🛡️ **RAID WEEKEND HAS ENDED!** 🛡️')
                    .setDescription(
                        enableRaiding
                            ? '**Raiding is ENABLED** - Bases and containers can be damaged!'
                            : '**Raiding is DISABLED** - Bases and containers are protected!'
                    )
                    .addField(
                        enableRaiding ? '⏰ Raid Weekend Ends In' : '⏰ Next Raid Weekend Starts In',
                        countdown || 'See schedule with /admin killfeed raiding status',
                        false
                    )
                    .addField(
                        '🔴 Status',
                        enableRaiding ? '**ACTIVE - PVP RAIDING ALLOWED**' : '**PROTECTED - NO RAIDING**',
                        false
                    )
                    .addField(
                        '⚠️ Server Restart Required',
                        `Changes will take effect after the next restart.\n${nextRestart}`,
                        false
                    )
                    .setFooter({ text: 'Automatic schedule triggered' })
                    .setTimestamp();
                
                await announcementChannel.send({
                    content: '@everyone',
                    embeds: [embed]
                });
                
                console.log(`[AUTO RAID] Announcement sent to ${announcementChannel.name}`);
            }
        } finally {
            client.close();
        }
    } catch (error) {
        console.error('[AUTO RAID] Error:', error);
    }
}

function calculateRaidCountdown(guildConfig) {
    try {
        const isActive = guildConfig.raid_currently_active;
        const targetDay = isActive ? guildConfig.raid_end_day : guildConfig.raid_start_day;
        const targetTime = isActive ? guildConfig.raid_end_time : guildConfig.raid_start_time;
        const timezone = guildConfig.raid_timezone || 'America/New_York';
        
        const now = new Date().toLocaleString('en-US', { timeZone: timezone });
        const currentDate = new Date(now);
        const currentDay = currentDate.getDay();
        const currentHours = currentDate.getHours();
        const currentMinutes = currentDate.getMinutes();
        
        const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
        
        let daysUntil = targetDay - currentDay;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) {
            const currentTotalMinutes = currentHours * 60 + currentMinutes;
            const targetTotalMinutes = targetHours * 60 + targetMinutes;
            if (currentTotalMinutes >= targetTotalMinutes) {
                daysUntil = 7;
            }
        }
        
        const targetDate = new Date(currentDate);
        targetDate.setDate(targetDate.getDate() + daysUntil);
        targetDate.setHours(targetHours, targetMinutes, 0, 0);
        
        const diff = targetDate - currentDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `**${days} days, ${hours} hours, ${minutes} minutes**`;
    } catch (error) {
        console.error('[RAID COUNTDOWN] Error:', error);
        return null;
    }
}

function getNextRestartTime(restartHours) {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const hours = restartHours.split(',').map(Number).sort((a, b) => a - b);
        
        let nextHour = hours.find(h => h > currentHour);
        if (!nextHour) nextHour = hours[0];
        
        const nextRestart = new Date(now);
        if (nextHour < currentHour) {
            nextRestart.setDate(nextRestart.getDate() + 1);
        }
        nextRestart.setHours(nextHour, 0, 0, 0);
        
        const diff = nextRestart - now;
        const hours_until = Math.floor(diff / (1000 * 60 * 60));
        const minutes_until = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `In **${hours_until} hours, ${minutes_until} minutes** (at ${String(nextHour).padStart(2, '0')}:00)`;
    } catch (error) {
        console.error('[RESTART TIME] Error:', error);
        return 'Unknown';
    }
}

bot.on('error', err => {
    console.log(err);
});

// Process error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// --- Connection/Disconnection Log Monitor ---
const CONNECTIONS_CHANNEL_ID = '1405195781639770224'; // Discord channel for connections
let lastSeenLogLine = '';
let lastRestartTime = 0;
let lastCleanupCheck = 0;

// Server restart times: 3, 6, 9, 12 (am/pm) EST = 8, 11, 14, 17, 20, 23, 2, 5 UTC
// Cleanup runs 15 minutes after
const RESTART_HOURS = [8, 11, 14, 17, 20, 23, 2, 5]; // UTC hours

// Helper: Check if it's time to cleanup after scheduled restart
async function checkScheduledCleanup(guildId) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeSinceLastCheck = Date.now() - lastCleanupCheck;
    
    // Only check once per hour
    if (timeSinceLastCheck < 50 * 60 * 1000) return;
    
    // Check if we're 15-20 minutes after a restart hour
    for (const restartHour of RESTART_HOURS) {
        const hourDiff = currentHour - restartHour;
        
        // Handle midnight wraparound
        const adjustedDiff = hourDiff < 0 ? hourDiff + 24 : hourDiff;
        
        if (adjustedDiff === 0 && currentMinute >= 15 && currentMinute <= 20) {
            // We're in the cleanup window - calculate actual restart time
            const restartDate = new Date(now);
            restartDate.setHours(restartHour, 0, 0, 0);
            lastRestartTime = restartDate.getTime();
            lastCleanupCheck = Date.now();
            
            console.log(`[RESTART] Cleanup window detected after ${restartHour}:00 restart`);
            
            // Spawn pending kits BEFORE cleanup
            await spawnPendingKits(guildId);
            
            // Then cleanup old spawns
            await cleanupSpawnJson(guildId);
            return;
        }
    }
}

// Helper: Detect server restart and schedule spawn cleanup (legacy fallback)
function checkForServerRestart(logText) {
    // Look for restart indicators - when log starts fresh or sees "Game started"
    const lines = logText.split(/\r?\n/);
    const now = Date.now();
    
    // Check for restart indicators
    const hasRestartIndicator = lines.some(line => 
        line.includes('===') || // Log separator
        line.includes('Started') ||
        line.includes('Mission read from')
    );
    
    // If we see restart indicators and enough time has passed (10 min)
    if (hasRestartIndicator && (now - lastRestartTime > 10 * 60 * 1000)) {
        lastRestartTime = now;
    }
}

// Helper: Clear spawn.json after restart (only remove old items)
async function cleanupSpawnJson(guildId) {
    // Get guild configuration
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        console.log('[RESTART] Guild not configured, skipping cleanup');
        return;
    }
    
    const platformPath = getPlatformPath(guildConfig.platform);
    const FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
    const FTP_FILE_PATH = `/${platformPath}_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
    const BASE_URL = 'https://api.nitrado.net/services';
    
    try {
        console.log('[RESTART] Cleaning up old spawn entries...');
        
        // Step 1: Download current spawn.json
        let spawnJson = { Objects: [] };
        try {
            const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(FILE_PATH)}`;
            const downloadResp = await axios.get(downloadUrl, {
                headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
            });
            
            const fileUrl = downloadResp.data.data.token.url;
            const fileResp = await axios.get(fileUrl);
            
            if (fileResp.data && Array.isArray(fileResp.data.Objects)) {
                spawnJson = fileResp.data;
            }
        } catch (downloadErr) {
            console.log('[RESTART] Could not download spawn.json:', downloadErr.message);
            return;
        }
        
        // Step 2: Only remove items purchased before this restart
        const originalCount = spawnJson.Objects.length;
        spawnJson.Objects = spawnJson.Objects.filter(obj => {
            if (!obj.customString) return true; // Keep non-shop items
            
            try {
                const data = JSON.parse(obj.customString);
                const itemTimestamp = parseInt(data.restart_id) || 0;
                
                // Keep items purchased after the restart time
                return itemTimestamp > lastRestartTime;
            } catch {
                return true; // Keep if can't parse
            }
        });
        
        const removedCount = originalCount - spawnJson.Objects.length;
        console.log(`[RESTART] Removed ${removedCount} old spawn entries, kept ${spawnJson.Objects.length} new ones`);
        
        // Step 3: Upload cleaned spawn.json via FTP
        const infoUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers`;
        const infoResp = await axios.get(infoUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
        
        const { Client } = require('basic-ftp');
        const client = new Client();
        client.ftp.verbose = false;
        
        try {
            await client.access({
                host: ftpCreds.hostname,
                user: ftpCreds.username,
                password: ftpCreds.password,
                port: ftpCreds.port || 21,
                secure: false
            });
            
            const tmpPath = path.join(__dirname, 'spawn_temp_cleanup.json');
            fs.writeFileSync(tmpPath, JSON.stringify(spawnJson, null, 2));
            
            await client.uploadFrom(tmpPath, FTP_FILE_PATH);
            fs.unlinkSync(tmpPath);
            
            console.log('[RESTART] spawn.json cleanup complete');
        } finally {
            client.close();
        }
    } catch (err) {
        console.error('[RESTART] Error cleaning spawn.json:', err.message);
    }
}

// Helper: Convert military time to 12-hour format
function convertTo12Hour(time24) {
    const [hours, minutes, seconds] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes}:${seconds} ${ampm}`;
}

// Helper: Parse connection/disconnection events from log text
function parseConnectionEvents(logText) {
    const lines = logText.split(/\r?\n/);
    const events = [];
    for (const line of lines) {
        let match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) is connected/);
        if (match) {
            events.push({ type: 'connect', time: convertTo12Hour(match[1]), player: match[2], raw: line });
            continue;
        }
        match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) has been disconnected/);
        if (match) {
            events.push({ type: 'disconnect', time: convertTo12Hour(match[1]), player: match[2], raw: line });
        }
    }
    return events;
}

// Helper: Post event to Discord (no economy integration)
async function postConnectionEventToDiscord(event) {
    try {
        const { MessageEmbed } = require('discord.js');
        const channel = await bot.channels.fetch(CONNECTIONS_CHANNEL_ID);
        if (!channel) return;
        let embed;
        if (event.type === 'connect') {
            embed = new MessageEmbed()
                .setColor('#43b581') // Discord green
                .setTitle('🟢 Player Connected')
                .setDescription(`**${event.player}** joined the server.`)
                .addField('Time', event.time, true);
        } else if (event.type === 'disconnect') {
            embed = new MessageEmbed()
                .setColor('#ff5555') // Discord red
                .setTitle('🔴 Player Disconnected')
                .setDescription(`**${event.player}** left the server.`)
                .addField('Time', event.time, true);
        }
        if (embed) await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Failed to post to Discord:', err.message);
    }
}

// Main: Poll log every 120 seconds
async function pollDayZLogForConnections() {
    try {
        const { filename, url } = await fetchMostRecentDayZLog();
        const resp = await axios.get(url);
        const logText = resp.data;
        const events = parseConnectionEvents(logText);
        
        // Check for scheduled cleanup time
        checkScheduledCleanup();
        
        // Check for server restart indicator (legacy fallback)
        checkForServerRestart(logText);
        
        // Only post new events since last poll
        let newEvents = events;
        if (lastSeenLogLine) {
            const idx = events.findIndex(e => e.raw === lastSeenLogLine);
            if (idx !== -1) newEvents = events.slice(idx + 1);
        }
        for (const event of newEvents) {
            await postConnectionEventToDiscord(event);
        }
        if (events.length > 0) lastSeenLogLine = events[events.length - 1].raw;
    } catch (err) {
        console.error('Error polling DayZ log:', err.message);
        }
    }

bot.on('ready', () => {
    // OLD SINGLE-SERVER SYSTEMS: Replaced by MultiGuildKillfeed
    // setInterval(pollDayZLogForConnections, 120 * 1000); // poll every 120 seconds
    // setInterval(pollDayZLogForBuilds, 120 * 1000); // poll build-log every 120 seconds
    // setInterval(pollDayZLogForSuicides, 120 * 1000); // poll suicide-log every 120 seconds
    // setInterval(pollDayZLogForKillfeed, 120 * 1000);
});

// TEST: Show most recent DayZ log file and download URL on startup
if (require.main === module) {
    fetchMostRecentDayZLog()
        .then(({ filename, url }) => {
            console.log('Most recent DayZ log file:', filename);
            console.log('Download URL:', url);
        })
        .catch(err => {
            console.error('Failed to fetch most recent DayZ log:', err.message);
        });
}

// Fetch log files from Nitrado API
async function fetchNitradoLogs() {
    try {
        const response = await axios.get(`https://api.nitrado.net/services/${config.ID1}/gameservers`, {
            headers: {
                'Authorization': `Bearer ${config.NITRATOKEN}`
            }
        });
        // You can adjust this to return specific log data as needed
        return response.data;
    } catch (error) {
        console.error('Error fetching Nitrado logs:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports.fetchNitradoLogs = fetchNitradoLogs;
