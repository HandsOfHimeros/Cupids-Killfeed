// Multi-Guild Killfeed System
const axios = require('axios');
const db = require('./database.js');
const { MessageEmbed } = require('discord.js');

class MultiGuildKillfeed {
    constructor(bot) {
        this.bot = bot;
        this.guildStates = new Map(); // guild_id -> { lastKillfeedLine, lastBuildlogLine, lastSuicidelogLine, lastPollTime }
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
                        lastKillfeedLine: '',
                        lastBuildlogLine: '',
                        lastSuicidelogLine: '',
                        lastPollTime: 0
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
        const state = this.guildStates.get(guildId) || { 
            lastKillfeedLine: '', 
            lastBuildlogLine: '', 
            lastSuicidelogLine: '', 
            lastPollTime: 0 
        };
        
        console.log(`[MULTI-KILLFEED] Polling guild ${guildId}...`);
        
        // Fetch log from this guild's Nitrado server
        const logData = await this.fetchGuildLog(guildConfig);
        if (!logData) return;
        
        // Debug: Log first and last few lines
        const lines = logData.split('\n');
        console.log(`[MULTI-KILLFEED] Guild ${guildId}: Log has ${lines.length} lines`);
        
        // Parse and post killfeed events
        const killfeedEvents = this.parseKillfeedEvents(logData);
        console.log(`[MULTI-KILLFEED] Guild ${guildId}: Found ${killfeedEvents.length} total killfeed events`);
        let newKillfeedEvents = killfeedEvents;
        if (state.lastKillfeedLine) {
            const idx = killfeedEvents.findIndex(e => e.raw === state.lastKillfeedLine);
            if (idx !== -1) newKillfeedEvents = killfeedEvents.slice(idx + 1);
        }
        if (newKillfeedEvents.length > 0) {
            console.log(`[MULTI-KILLFEED] Guild ${guildId}: ${newKillfeedEvents.length} new killfeed events`);
            for (const event of newKillfeedEvents) {
                await this.postKillfeedToGuild(guildConfig, event);
            }
            state.lastKillfeedLine = killfeedEvents[killfeedEvents.length - 1]?.raw || state.lastKillfeedLine;
        }
        
        // Parse and post buildlog events
        const buildlogEvents = this.parseBuildlogEvents(logData);
        console.log(`[MULTI-KILLFEED] Guild ${guildId}: Found ${buildlogEvents.length} total buildlog events`);
        let newBuildlogEvents = buildlogEvents;
        if (state.lastBuildlogLine) {
            const idx = buildlogEvents.findIndex(e => e.raw === state.lastBuildlogLine);
            if (idx !== -1) newBuildlogEvents = buildlogEvents.slice(idx + 1);
        }
        if (newBuildlogEvents.length > 0) {
            console.log(`[MULTI-KILLFEED] Guild ${guildId}: ${newBuildlogEvents.length} new buildlog events`);
            for (const event of newBuildlogEvents) {
                await this.postBuildlogToGuild(guildConfig, event);
            }
            state.lastBuildlogLine = buildlogEvents[buildlogEvents.length - 1]?.raw || state.lastBuildlogLine;
        }
        
        // Parse and post suicidelog events
        const suicidelogEvents = this.parseSuicidelogEvents(logData);
        console.log(`[MULTI-KILLFEED] Guild ${guildId}: Found ${suicidelogEvents.length} total suicidelog events`);
        let newSuicidelogEvents = suicidelogEvents;
        if (state.lastSuicidelogLine) {
            const idx = suicidelogEvents.findIndex(e => e.raw === state.lastSuicidelogLine);
            if (idx !== -1) newSuicidelogEvents = suicidelogEvents.slice(idx + 1);
        }
        if (newSuicidelogEvents.length > 0) {
            console.log(`[MULTI-KILLFEED] Guild ${guildId}: ${newSuicidelogEvents.length} new suicidelog events`);
            for (const event of newSuicidelogEvents) {
                await this.postSuicidelogToGuild(guildConfig, event);
            }
            state.lastSuicidelogLine = suicidelogEvents[suicidelogEvents.length - 1]?.raw || state.lastSuicidelogLine;
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
            }
        }
        
        return events;
    }

    async postEventToGuild(guildConfig, event) {
        try {
            const channelId = guildConfig.killfeed_channel_id;
            if (!channelId) return;
            
            const channel = await this.bot.channels.fetch(channelId);
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
        } catch (error) {
            console.error(`[MULTI-KILLFEED] Error posting event for guild ${guildConfig.guild_id}:`, error.message);
        }
    }

    // Rename to be more specific
    async postKillfeedToGuild(guildConfig, event) {
        return this.postEventToGuild(guildConfig, event);
    }

    parseBuildlogEvents(logText) {
        const logString = typeof logText === 'string' ? logText : String(logText);
        const lines = logString.split(/\r?\n/);
        const events = [];
        
        for (const line of lines) {
            if (line.includes('placed')) {
                const match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) placed (.+)$/);
                if (match) {
                    events.push({ 
                        time: match[1], 
                        player: match[2], 
                        details: match[3], 
                        raw: line 
                    });
                }
            }
        }
        
        return events;
    }

    async postBuildlogToGuild(guildConfig, event) {
        try {
            const channelId = guildConfig.buildlog_channel_id;
            if (!channelId) return;
            
            const channel = await this.bot.channels.fetch(channelId);
            if (!channel) return;
            
            let embed = new MessageEmbed()
                .setColor('#7289da')
                .setTitle('🏗️ Build Log')
                .setDescription(event.details)
                .setTimestamp();
            
            if (event.player) embed.addField('Player', event.player, true);
            if (event.time) embed.addField('Time', event.time, true);
            
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`[MULTI-KILLFEED] Error posting buildlog for guild ${guildConfig.guild_id}:`, error.message);
        }
    }

    parseSuicidelogEvents(logText) {
        const logString = typeof logText === 'string' ? logText : String(logText);
        const lines = logString.split(/\r?\n/);
        const events = [];
        
        for (const line of lines) {
            if (line.includes('died')) {
                const match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) died. (.*)$/);
                if (match) {
                    events.push({ 
                        time: match[1], 
                        player: match[2], 
                        reason: match[3], 
                        raw: line 
                    });
                }
            }
        }
        
        return events;
    }

    async postSuicidelogToGuild(guildConfig, event) {
        try {
            const channelId = guildConfig.suicidelog_channel_id;
            if (!channelId) return;
            
            const channel = await this.bot.channels.fetch(channelId);
            if (!channel) return;
            
            let embed = new MessageEmbed()
                .setColor('#ff6b6b')
                .setTitle('💔 Suicide Log')
                .setDescription(`**${event.player}** died`)
                .setTimestamp();
            
            if (event.reason) embed.addField('Reason', event.reason, true);
            if (event.time) embed.addField('Time', event.time, true);
            
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`[MULTI-KILLFEED] Error posting suicidelog for guild ${guildConfig.guild_id}:`, error.message);
        }
    }

    stop() {
        this.isRunning = false;
        console.log('[MULTI-KILLFEED] Stopped multi-guild killfeed monitoring');
    }
}

module.exports = MultiGuildKillfeed;
