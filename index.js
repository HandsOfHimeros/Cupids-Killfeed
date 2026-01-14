// --- Killfeed Channel Monitor ---
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('./database.js');
const MultiGuildKillfeed = require('./multi_guild_killfeed.js');
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
    // Get guild configuration
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        throw new Error('Guild not configured. Please run /admin killfeed setup first.');
    }
    
    const FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
    const FTP_FILE_PATH = `/dayzps_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
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
        
        // Step 3.5: Try to get player's actual location from database
        let playerPos = template.pos || [0, 0, 0];
        if (spawnEntry.dayzPlayerName) {
            console.log(`[SPAWN] Looking up location for: "${spawnEntry.dayzPlayerName}"`);
            const location = await db.getPlayerLocation(guildId, spawnEntry.dayzPlayerName);
            if (location) {
                // DayZ spawn format is [X, Z, Y] where Z is elevation
                playerPos = [location.x, location.z, location.y];
                console.log(`[SPAWN] Found location for ${spawnEntry.dayzPlayerName}:`, playerPos);
            } else {
                console.log(`[SPAWN] No location found for ${spawnEntry.dayzPlayerName}, using template position`);
            }
        } else {
            console.log('[SPAWN] No dayzPlayerName provided in spawn entry');
        }
        
        // Step 4: Create spawn object using template from spawn.json
        const spawnObject = {
            ...template,
            name: spawnEntry.class, // Ensure name is always the item class
            pos: playerPos,
            customString: JSON.stringify({
                userId: spawnEntry.userId,
                dayzPlayerName: spawnEntry.dayzPlayerName,
                item: spawnEntry.item,
                timestamp: spawnEntry.timestamp,
                restart_id: spawnEntry.restart_id
            })
        };
        
        console.log('[SPAWN] Using template for', spawnEntry.class, ':', JSON.stringify(template));
        console.log('[SPAWN] Spawn position:', playerPos);
        
        // Step 5: Add to Objects array
        spawnJson.Objects.push(spawnObject);
        console.log(`[SPAWN] Added spawn, total objects: ${spawnJson.Objects.length}`);
        
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
            
            // Write to temp file and upload
            const tmpPath = path.join(__dirname, 'logs', `spawn_${Date.now()}.json`);
            fs.writeFileSync(tmpPath, JSON.stringify(spawnJson, null, 2), 'utf8');
            
            await client.uploadFrom(tmpPath, FTP_FILE_PATH);
            fs.unlinkSync(tmpPath);
            
            console.log('[SPAWN] Successfully uploaded spawn.json via FTP');
        } finally {
            client.close();
        }
        
    } catch (err) {
        console.error('[SPAWN] Error adding spawn entry:', err.response ? err.response.data : err.message);
        throw err;
    }
}

module.exports.addCupidSpawnEntry = addCupidSpawnEntry;

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
const config = require('./config.json');
const moment = require('moment-timezone');
const nodeoutlook = require('nodejs-nodemailer-outlook');

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

bot.on('interactionCreate', async interaction => {
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'guild_setup_modal') {
            const adminCommand = bot.commands.get('admin');
            if (adminCommand && adminCommand.handleSetupModalSubmit) {
                await adminCommand.handleSetupModalSubmit(interaction);
            }
        }
        return;
    }
    
    // Handle campaign button interactions
    if (interaction.isButton() && interaction.customId.startsWith('campaign_')) {
        const economyCommand = bot.commands.get('economy');
        if (economyCommand && economyCommand.handleCampaignChoice) {
            await economyCommand.handleCampaignChoice(interaction);
        }
        return;
    }
    
    if (!interaction.isCommand()) return;

    const command = bot.commands.get(interaction.commandName);

    if (!command) return;

    try {
        // If the command file exports a single execute, call it
        // If it exports a multi-command handler (like economy.js), call its execute with the interaction
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
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

bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`);
    console.log('KILLFEED IS ACTIVE!');
    
    // Start multi-guild killfeed monitoring
    if (!multiGuildKillfeed) {
        multiGuildKillfeed = new MultiGuildKillfeed(bot);
        multiGuildKillfeed.start();
    }
});

bot.on('error', err => {
    console.log(err);
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
function checkScheduledCleanup() {
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
            cleanupSpawnJson(guildId); // Use time-based filtering to preserve new purchases
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
    
    const FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
    const FTP_FILE_PATH = `/dayzps_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
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
