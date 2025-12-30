// Multi-Guild Killfeed System
const axios = require('axios');
const db = require('./database.js');
const { MessageEmbed } = require('discord.js');

class MultiGuildKillfeed {
    constructor(bot) {
        this.bot = bot;
        this.guildStates = new Map(); // guild_id -> { lastLogLine, lastPollTime, lastRestartTime, lastCleanupCheck }
        this.pollInterval = 120000; // 2 minutes
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[MULTI-KILLFEED] Starting multi-guild killfeed monitoring...');
        
        // Initial load of all guilds
        await this.loadGuilds();
        
        // Start polling loop
        this.pollLoop();
    }

    async loadGuilds() {
        try {
            const guilds = await db.getAllGuildConfigs();
            console.log(`[MULTI-KILLFEED] Loaded ${guilds.length} configured guilds`);
            
            for (const guild of guilds) {
                if (!this.guildStates.has(guild.guild_id)) {
                    this.guildStates.set(guild.guild_id, {
                        lastLogLine: guild.last_killfeed_line || '',
                        lastPollTime: 0,
                        lastRestartTime: 0,
                        lastCleanupCheck: 0
                    });
                }
            }
        } catch (error) {
            console.error('[MULTI-KILLFEED] Error loading guilds:', error);
        }
    }

    async pollLoop() {
        while (this.isRunning) {
            try {
                await this.pollAllGuilds();
            } catch (error) {
                console.error('[MULTI-KILLFEED] Error in poll loop:', error);
            }
            
            // Wait for next poll
            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
    }

    async pollAllGuilds() {
        const guilds = await db.getAllGuildConfigs();
        
        for (const guildConfig of guilds) {
            try {
                await this.pollGuild(guildConfig);
            } catch (error) {
                console.error(`[MULTI-KILLFEED] Error polling guild ${guildConfig.guild_id}:`, error.message);
            }
        }
    }

    async pollGuild(guildConfig) {
        const guildId = guildConfig.guild_id;
        const state = this.guildStates.get(guildId) || { lastLogLine: '', lastPollTime: 0, lastRestartTime: 0, lastCleanupCheck: 0 };
        
        console.log(`[MULTI-KILLFEED] Polling guild ${guildId}...`);
        
        // Fetch log from this guild's Nitrado server
        const logData = await this.fetchGuildLog(guildConfig);
        if (!logData) return;
        
        // Check for server restart and trigger cleanup if needed
        await this.checkRestartWindow(guildConfig, state, logData);
        
        // Parse events
        const events = this.parseKillfeedEvents(logData);
        
        // Filter to only new events
        let newEvents = events;
        if (state.lastLogLine && events.length > 0) {
            // Find where we left off - look from the end backwards for efficiency
            let foundIndex = -1;
            for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].raw === state.lastLogLine) {
                    foundIndex = i;
                    break;
                }
            }
            
            if (foundIndex !== -1) {
                newEvents = events.slice(foundIndex + 1);
            } else {
                // If we can't find the last line, assume all events are old if last poll was recent
                const timeSinceLastPoll = Date.now() - state.lastPollTime;
                if (timeSinceLastPoll < 300000) { // Less than 5 minutes
                    console.log(`[MULTI-KILLFEED] Guild ${guildId}: Can't find last line, assuming all are old`);
                    newEvents = [];
                }
                // Otherwise, if it's been a while, post all events (might be new log file)
            }
        }
        
        // Post new events to this guild's killfeed channel
        if (newEvents.length > 0) {
            console.log(`[MULTI-KILLFEED] Guild ${guildId}: ${newEvents.length} new events`);
            for (const event of newEvents) {
                await this.postEventToGuild(guildConfig, event);
            }
        }
        
        // Always update last seen line if there are any events in the log
        if (events.length > 0) {
            state.lastLogLine = events[events.length - 1].raw;
            // Persist to database
            await db.updateKillfeedState(guildId, state.lastLogLine);
        }
        
        state.lastPollTime = Date.now();
        this.guildStates.set(guildId, state);
    }

    async fetchGuildLog(guildConfig) {
        try {
            // Get list of log files
            const listUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/list?dir=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/`;
            
            const listResp = await axios.get(listUrl, {
                headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
            });
            
            if (!listResp.data?.data?.entries) {
                console.error(`[MULTI-KILLFEED] No log files found for guild ${guildConfig.guild_id}`);
                return null;
            }
            
            // Find most recent .ADM file
            const admFiles = listResp.data.data.entries
                .filter(e => e.name.endsWith('.ADM'))
                .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
            
            if (admFiles.length === 0) {
                console.error(`[MULTI-KILLFEED] No .ADM files for guild ${guildConfig.guild_id}`);
                return null;
            }
            
            const latestFile = admFiles[0];
            
            // Download log file - first get the temporary download URL
            const downloadUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/${latestFile.name}`;
            
            const downloadResp = await axios.get(downloadUrl, {
                headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
            });
            
            // The actual file URL is in downloadResp.data.data.token.url
            const fileUrl = downloadResp.data.data.token.url;
            
            // Now fetch the actual log file content
            const logResp = await axios.get(fileUrl, {
                responseType: 'text'
            });
            
            return logResp.data;
        } catch (error) {
            console.error(`[MULTI-KILLFEED] Error fetching log for guild ${guildConfig.guild_id}:`, error.message);
            return null;
        }
    }

    parseKillfeedEvents(logText) {
        // Ensure logText is a string
        const logString = typeof logText === 'string' ? logText : String(logText);
        const lines = logString.split(/\r?\n/);
        const events = [];
        
        for (const line of lines) {
            if (line.includes('transporthit')) continue;
            
            let match;
            if (line.includes('killed by')) {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) killed by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
                if (match) {
                    events.push({ 
                        type: 'kill', 
                        time: match[1], 
                        victim: match[2], 
                        killer: match[3], 
                        weapon: match[4], 
                        raw: line 
                    });
                }
            } else if (line.includes('hit by')) {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) hit by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
                if (match) {
                    events.push({ 
                        type: 'hit', 
                        time: match[1], 
                        victim: match[2], 
                        attacker: match[3], 
                        weapon: match[4], 
                        raw: line 
                    });
                }
            } else if (line.includes('is connected')) {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) is connected$/);
                if (match) {
                    events.push({
                        type: 'connected',
                        time: match[1],
                        player: match[2],
                        raw: line
                    });
                }
            } else if (line.includes('has been disconnected')) {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) has been disconnected$/);
                if (match) {
                    events.push({
                        type: 'disconnected',
                        time: match[1],
                        player: match[2],
                        raw: line
                    });
                }
            } else if (line.includes('committed suicide')) {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) committed suicide$/);
                if (match) {
                    events.push({
                        type: 'suicide',
                        time: match[1],
                        player: match[2],
                        raw: line
                    });
                }
            } else if (line.includes('placed') || line.includes('raised')) {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) (placed|raised) (.+) at position/);
                if (match) {
                    events.push({
                        type: 'build',
                        time: match[1],
                        player: match[2],
                        action: match[3],
                        item: match[4],
                        raw: line
                    });
                }
            }
        }
        
        return events;
    }

    async postEventToGuild(guildConfig, event) {
        try {
            let channelId;
            
            // Route to appropriate channel based on event type
            if (event.type === 'connected' || event.type === 'disconnected') {
                channelId = guildConfig.connections_channel_id;
            } else {
                channelId = guildConfig.killfeed_channel_id;
            }
            
            if (!channelId) return;
            
            const channel = await this.bot.channels.fetch(channelId);
            if (!channel) return;
            
            let embed = new MessageEmbed().setTimestamp();
            
            if (event.type === 'kill') {
                embed.setColor('#ff0000');
                if (event.killer && event.victim && event.weapon) {
                    embed.setTitle('☠️ Killfeed')
                        .setDescription(`**${event.killer}** killed **${event.victim}**`)
                        .addField('Weapon', event.weapon, true)
                        .addField('Time', event.time, true);
                } else {
                    embed.setTitle('☠️ Killfeed').setDescription(event.raw);
                }
            } else if (event.type === 'hit') {
                embed.setColor('#ffaa00');
                if (event.attacker && event.victim && event.weapon) {
                    embed.setTitle('💥 Hitfeed')
                        .setDescription(`**${event.attacker}** hit **${event.victim}**`)
                        .addField('Weapon', event.weapon, true)
                        .addField('Time', event.time, true);
                } else {
                    embed.setTitle('💥 Hitfeed').setDescription(event.raw);
                }
            } else if (event.type === 'connected') {
                embed.setColor('#00ff00')
                    .setTitle('🟢 Player Connected')
                    .setDescription(`**${event.player}** joined the server`)
                    .addField('Time', event.time, true);
            } else if (event.type === 'disconnected') {
                embed.setColor('#ff0000')
                    .setTitle('🔴 Player Disconnected')
                    .setDescription(`**${event.player}** left the server`)
                    .addField('Time', event.time, true);
            } else if (event.type === 'suicide') {
                embed.setColor('#800080')
                    .setTitle('💀 Suicide')
                    .setDescription(`**${event.player}** committed suicide`)
                    .addField('Time', event.time, true);
            } else if (event.type === 'build') {
                embed.setColor('#0099ff')
                    .setTitle('🔨 Build Event')
                    .setDescription(`**${event.player}** ${event.action} **${event.item}**`)
                    .addField('Time', event.time, true);
            }
            
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`[MULTI-KILLFEED] Error posting event for guild ${guildConfig.guild_id}:`, error.message);
        }
    }

    stop() {
        this.isRunning = false;
        console.log('[MULTI-KILLFEED] Stopped multi-guild killfeed monitoring');
    }

    async checkRestartWindow(guildConfig, state, logData) {
        const restartHours = guildConfig.restart_hours ? guildConfig.restart_hours.split(',').map(h => parseInt(h.trim())) : [3, 9, 15, 21];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Check if we're in a cleanup window (5-15 minutes after restart)
        for (const restartHour of restartHours) {
            if (currentHour === restartHour && currentMinutes >= 5 && currentMinutes <= 15) {
                // Check if we already did cleanup for this restart
                const timeSinceLastCleanup = Date.now() - state.lastCleanupCheck;
                if (timeSinceLastCleanup < 30 * 60 * 1000) { // Skip if cleaned up in last 30 minutes
                    return;
                }
                
                const restartDate = new Date(now);
                restartDate.setHours(restartHour, 0, 0, 0);
                state.lastRestartTime = restartDate.getTime();
                state.lastCleanupCheck = Date.now();
                
                console.log(`[RESTART] Guild ${guildConfig.guild_id}: Cleanup window detected after ${restartHour}:00 restart`);
                await this.cleanupSpawnJson(guildConfig, state);
                return;
            }
        }
    }

    async cleanupSpawnJson(guildConfig, state) {
        const FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
        const FTP_FILE_PATH = `/dayzps_missions/dayzOffline.${guildConfig.map_name}/custom/spawn.json`;
        const BASE_URL = 'https://api.nitrado.net/services';
        const axios = require('axios');
        const fs = require('fs');
        const path = require('path');
        
        try {
            console.log(`[RESTART] Guild ${guildConfig.guild_id}: Cleaning up old spawn entries...`);
            
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
                console.log(`[RESTART] Guild ${guildConfig.guild_id}: Could not download spawn.json:`, downloadErr.message);
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
                    return itemTimestamp > state.lastRestartTime;
                } catch {
                    return true; // Keep if can't parse
                }
            });
            
            const removedCount = originalCount - spawnJson.Objects.length;
            console.log(`[RESTART] Guild ${guildConfig.guild_id}: Removed ${removedCount} old spawn entries, kept ${spawnJson.Objects.length} new ones`);
            
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
                
                const tmpPath = path.join(__dirname, `spawn_temp_cleanup_${guildConfig.guild_id}.json`);
                fs.writeFileSync(tmpPath, JSON.stringify(spawnJson, null, 2));
                
                await client.uploadFrom(tmpPath, FTP_FILE_PATH);
                fs.unlinkSync(tmpPath);
                
                console.log(`[RESTART] Guild ${guildConfig.guild_id}: spawn.json cleanup complete`);
            } finally {
                client.close();
            }
        } catch (err) {
            console.error(`[RESTART] Guild ${guildConfig.guild_id}: Error cleaning spawn.json:`, err.message);
        }
    }
}

module.exports = MultiGuildKillfeed;
