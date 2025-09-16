// --- Cupid Spawn Utility ---
// Adds a spawn entry to Cupid on Nitrado via API
const CUPID_FILE_PATH = '/games/ni11886592_1/ftproot/dayzps_missions/dayzOffline.chernarusplus/custom/Cupid.json';
const NITRADO_BASE_URL = 'https://api.nitrado.net/services';
const config = require('./config.json');

async function addCupidSpawnEntry(entry) {
    const axios = require('axios');
    const fs = require('fs');
    const FormData = require('form-data');
    // Download current Cupid
    const downloadUrl = `${NITRADO_BASE_URL}/${config.ID1}/gameservers/file_server/download?file=${encodeURIComponent(CUPID_FILE_PATH)}`;
    let cupidJson = { Objects: [] };
    try {
        const res = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${config.NITRATOKEN}` },
            responseType: 'json'
        });
        if (res.data && Array.isArray(res.data.Objects)) {
            cupidJson.Objects = res.data.Objects;
        }
    } catch (e) {
        console.error('[CUPID] Error downloading Cupid:', e.response ? e.response.data : e.message);
        cupidJson = { Objects: [] };
    }
    cupidJson.Objects.push(entry);
    // Write to a temp file
    const tempPath = './Cupid_upload.json';
    fs.writeFileSync(tempPath, JSON.stringify(cupidJson, null, 2));

    // Try both original and mission root upload paths
    const uploadPaths = [
        CUPID_FILE_PATH,
        '/games/ni11886592_1/ftproot/dayzps_missions/dayzOffline.chernarusplus/Cupid.json',
        '/games/ni11886592_1/ftproot//dayzps_missions/dayzOffline.chernarusplus/custom'
    ];
    let lastError = null;
    for (const path of uploadPaths) {
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(tempPath), 'Cupid.json');
            const uploadUrl = `https://api.nitrado.net/services/${config.ID1}/gameservers/file_server/upload?file=${encodeURIComponent(path)}`;
            console.log('[CUPID] Uploading to:', uploadUrl);
            console.log('[CUPID] FormData headers:', form.getHeaders());
            const response = await axios.post(uploadUrl, form, {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${config.NITRATOKEN}`,
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            console.log('[CUPID] Upload response:', response.data);
            if (response.data && response.data.status !== 'success') {
                throw new Error(`Nitrado upload failed: ${JSON.stringify(response.data)}`);
            }
            fs.unlinkSync(tempPath);
            return;
        } catch (e) {
            lastError = e;
            console.error(`[CUPID] Error uploading Cupid to ${path}:`, e.response ? e.response.data : e.message);
        }
    }
    fs.existsSync(tempPath) && fs.unlinkSync(tempPath);
    if (lastError) throw lastError;
}

module.exports.addCupidSpawnEntry = addCupidSpawnEntry;
// --- Killfeed Channel Monitor ---
const KILLFEED_CHANNEL_ID = '1404256735245373511'; // Discord channel for Killfeed
let lastSeenKillfeedLogLine = '';

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
const fs = require('fs');
const path = require('path');
const { Client, Collection, Intents } = require('discord.js');
// Removed destructuring require for GUILDID and TOKEN. Use config.GUILDID and config.TOKEN instead.
// ...existing code...
const axios = require('axios');
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
});

bot.on('error', err => {
    console.log(err);
});


// --- Connection/Disconnection Log Monitor ---
const CONNECTIONS_CHANNEL_ID = '1405195781639770224'; // Discord channel for connections
let lastSeenLogLine = '';

// Helper: Parse connection/disconnection events from log text
function parseConnectionEvents(logText) {
    const lines = logText.split(/\r?\n/);
    const events = [];
    for (const line of lines) {
        let match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) is connected/);
        if (match) {
            events.push({ type: 'connect', time: match[1], player: match[2], raw: line });
            continue;
        }
        match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) has been disconnected/);
        if (match) {
            events.push({ type: 'disconnect', time: match[1], player: match[2], raw: line });
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
                .addField('Time', event.time, true)
                .setTimestamp();
        } else if (event.type === 'disconnect') {
            embed = new MessageEmbed()
                .setColor('#ff5555') // Discord red
                .setTitle('🔴 Player Disconnected')
                .setDescription(`**${event.player}** left the server.`)
                .addField('Time', event.time, true)
                .setTimestamp();
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
    setInterval(pollDayZLogForConnections, 120 * 1000); // poll every 120 seconds
    setInterval(pollDayZLogForBuilds, 120 * 1000); // poll build-log every 120 seconds
    setInterval(pollDayZLogForSuicides, 120 * 1000); // poll suicide-log every 120 seconds
    setInterval(pollDayZLogForKillfeed, 120 * 1000); // poll killfeed every 120 seconds
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
