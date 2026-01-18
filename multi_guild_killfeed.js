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
        
        // Parse and update player locations from log
        await this.parseAndUpdateLocations(guildId, logData);
        
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
                // Only post events AFTER the last known line (foundIndex + 1 onwards)
                // This ensures no duplicates - we already posted everything up to foundIndex
                newEvents = events.slice(foundIndex + 1);
            } else {
                // If we can't find the last line, the log file might have rotated
                // Only post events if this is the first poll (lastPollTime is recent startup)
                const timeSinceLastPoll = Date.now() - state.lastPollTime;
                if (state.lastPollTime > 0 && timeSinceLastPoll < 300000) {
                    // Recently polled but can't find last line - log rotated
                    // Skip this batch to avoid duplicates, but update tracking to last event in current log
                    // so we can continue detecting new events going forward
                    console.log(`[MULTI-KILLFEED] Guild ${guildId}: Can't find last line, log may have rotated. Resetting tracking to current log.`);
                    newEvents = [];
                    // Update lastLogLine to the most recent event in the current log
                    if (events.length > 0) {
                        state.lastLogLine = events[events.length - 1].raw;
                        await db.updateKillfeedState(guildId, state.lastLogLine);
                        console.log(`[MULTI-KILLFEED] Guild ${guildId}: Tracking reset to latest event, will detect new events on next poll`);
                    }
                } else if (state.lastPollTime === 0) {
                    // First poll after bot startup - skip all old events to avoid duplicates
                    console.log(`[MULTI-KILLFEED] Guild ${guildId}: First poll after startup, skipping old events to prevent duplicates`);
                    newEvents = [];
                }
                // Otherwise post all (rare case of very long time since last poll)
            }
        } else if (state.lastLogLine === '' && events.length > 0) {
            // Empty lastLogLine means never polled before - skip old events to avoid initial spam
            console.log(`[MULTI-KILLFEED] Guild ${guildId}: No previous state, skipping old events`);
            newEvents = [];
        }
        
        // Post new events to this guild's killfeed channel
        if (newEvents.length > 0) {
            console.log(`[MULTI-KILLFEED] Guild ${guildId}: ${newEvents.length} new events`);
            for (const event of newEvents) {
                console.log(`[MULTI-KILLFEED] Posting event type: ${event.type}`);
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
            let match;
            // Extract timestamp from line
            const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2})/);
            if (!timeMatch) continue;
            const time = timeMatch[1];
            
            if (line.includes('killed by')) {
                // Try to parse details for formatted output
                let victim, killer, weapon, position;
                let isPlayerKill = false; // Flag to track if this is a player-vs-player kill
                
                let killMatch = line.match(/Player \"(.+?)\"\(id=[^)]*\s+pos=<([^,]+),\s*([^,]+),\s*([^>]+)>\)\s+killed by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
                if (killMatch) {
                    victim = killMatch[1];
                    position = { x: parseFloat(killMatch[2]), y: parseFloat(killMatch[3]), z: parseFloat(killMatch[4]) };
                    killer = killMatch[5];
                    weapon = killMatch[6];
                    isPlayerKill = true; // This is a player-vs-player kill
                } else {
                    // Try without position
                    killMatch = line.match(/Player \"(.+?)\"\(id=[^)]*\) killed by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
                    if (killMatch) {
                        victim = killMatch[1];
                        killer = killMatch[2];
                        weapon = killMatch[3];
                        isPlayerKill = true; // This is a player-vs-player kill
                    } else {
                        // Try zombie/AI/environmental format with position (e.g., grenades, zombies, fall damage)
                        killMatch = line.match(/(?:Player )?\"(.+?)\"(?:\s*\(DEAD\))?\s*\(id=[^)]*\s+pos=<([^,]+),\s*([^,]+),\s*([^>]+)>\)\s+killed by (.+)$/);
                        if (killMatch) {
                            victim = killMatch[1];
                            position = { x: parseFloat(killMatch[2]), y: parseFloat(killMatch[3]), z: parseFloat(killMatch[4]) };
                            killer = killMatch[5];
                            weapon = 'Unknown';
                            isPlayerKill = false; // Not a player kill (grenade, zombie, environment, etc.)
                        } else {
                            // Try zombie/AI/environmental format without position
                            killMatch = line.match(/(?:Player )?\"(.+?)\"(?:\s*\(DEAD\))?\s*\(id=[^)]*\)\s+killed by (.+)$/);
                            if (killMatch) {
                                victim = killMatch[1];
                                killer = killMatch[2];
                                weapon = 'Unknown';
                                isPlayerKill = false; // Not a player kill (grenade, zombie, environment, etc.)
                            }
                        }
                    }
                }
                
                events.push({ 
                    type: 'kill', 
                    time: time, 
                    victim: victim,
                    killer: killer,
                    weapon: weapon,
                    position: position,
                    isPlayerKill: isPlayerKill, // Add flag to event
                    raw: line 
                });
            } else if (line.includes('hit by') || line.includes('Struck by')) {
                // Try to parse hit details
                let victim, source, weapon, distance;
                
                // NEW FORMAT: "VictimName" Struck by: <Source>
                // Check for "Struck by" first (covers both player and environmental hits)
                if (line.includes('Struck by:')) {
                    // Extract victim name (before "Struck by:")
                    let victimMatch = line.match(/["']?([^"'\s]+)["']?\s*Struck by:/i);
                    if (victimMatch) {
                        victim = victimMatch[1];
                        
                        // Check if it's a player hit: Player "Name" (...) into BodyPart for damage with Weapon from distance meters
                        let playerHitMatch = line.match(/Struck by:\s*Player\s*["'](.+?)["']\s*\([^)]*\)\s*into\s*\S+\s*for\s*[\d.]+\s*damage\s*\([^)]*\)\s*with\s*(.+?)\s*from\s*([\d.]+)\s*meters/i);
                        if (playerHitMatch) {
                            source = `${playerHitMatch[1]} with ${playerHitMatch[2]} (${Math.round(parseFloat(playerHitMatch[3]))}m)`;
                        } else {
                            // Environmental hit: Struck by: <Source> with <DamageType> OR just Struck by: <Source>
                            let envMatch = line.match(/Struck by:\s*(.+?)(?:\s+with\s+(.+?))?$/i);
                            if (envMatch) {
                                let envSource = envMatch[1].trim();
                                let damageType = envMatch[2] ? envMatch[2].trim() : null;
                                source = damageType ? `${envSource} with ${damageType}` : envSource;
                            }
                        }
                    }
                }
                // Check for vehicle hit with TransportHit
                else {
                    let vehicleHitMatch = line.match(/Player "(.+?)"\(id=[^)]*\)[^h]*hit by (.+?) with TransportHit/i);
                    if (vehicleHitMatch) {
                        victim = vehicleHitMatch[1];
                        source = `${vehicleHitMatch[2]} (Vehicle)`;
                    } else {
                        // Try player-to-player hit
                        let hitMatch = line.match(/Player \"(.+?)\"\(id=[^)]*\) hit by Player \"(.+?)\"\(id=[^)]*\) with (.+)$/);
                        if (hitMatch) {
                            victim = hitMatch[1];
                            source = `${hitMatch[2]} with ${hitMatch[3]}`;
                        } else {
                            // Try environmental/zombie hit
                            hitMatch = line.match(/(?:Player )?\"(.+?)\"(?:\s*\(DEAD\))?\s*(?:\(id=[^)]*(?:\s+pos=[^)]+)?\))?(?:\[HP:\s*\d+(?:\.\d+)?\])?\s+hit by (.+)$/);
                            if (hitMatch) {
                                victim = hitMatch[1];
                                source = hitMatch[2];
                            }
                        }
                    }
                }
                
                events.push({ 
                    type: 'hit', 
                    time: time, 
                    victim: victim,
                    source: source,
                    raw: line 
                });
            } else if (line.includes('is connected')) {
                // Parse player name - try both quote types
                let player;
                let connectMatch = line.match(/Player \"(.+?)\"/);
                if (!connectMatch) connectMatch = line.match(/Player '(.+?)'/);
                if (connectMatch) player = connectMatch[1];
                
                events.push({
                    type: 'connected',
                    time: time,
                    player: player,
                    raw: line
                });
            } else if (line.includes('has been disconnected')) {
                // Parse player name - try both quote types
                let player;
                let disconnectMatch = line.match(/Player '(.+?)'/);
                if (!disconnectMatch) disconnectMatch = line.match(/Player \"(.+?)\"/);
                if (disconnectMatch) player = disconnectMatch[1];
                
                events.push({
                    type: 'disconnected',
                    time: time,
                    player: player,
                    raw: line
                });
            } else if (line.includes('committed suicide')) {
                // Parse player name and position
                let player, position;
                const suicideMatch = line.match(/Player \"(.+?)\"\(id=[^)]*\s+pos=<([^,]+),\s*([^,]+),\s*([^>]+)>\)/);
                if (suicideMatch) {
                    player = suicideMatch[1];
                    position = { x: parseFloat(suicideMatch[2]), y: parseFloat(suicideMatch[3]), z: parseFloat(suicideMatch[4]) };
                } else {
                    // Try without position
                    const simpleMatch = line.match(/Player \"(.+?)\"/);
                    if (simpleMatch) player = simpleMatch[1];
                }
                
                events.push({
                    type: 'suicide',
                    time: time,
                    player: player,
                    position: position,
                    raw: line
                });
            } else if (line.includes('placed') || line.includes('raised') || line.includes('dismantled') || line.includes('Built')) {
                // Parse build event details (optional - for formatted output)
                let player, action, item;
                
                // Try: Player "name" (id=X pos=Y) has placed/raised ITEM on/at
                match = line.match(/Player \"(.+?)\"\s*\(id=[^)]*(?:pos=[^)]+)?\)\s+has\s+(placed|raised)\s+(.+?)\s+(?:on|at)/);
                if (match) {
                    player = match[1];
                    action = match[2];
                    item = match[3].trim();
                } else {
                    // Try: Player "name" (id=X pos=Y) placed/raised ITEM<ClassName>
                    match = line.match(/Player \"(.+?)\"\s*\(id=[^)]*(?:pos=[^)]+)?\)\s+(placed|raised)\s+(.+?)(?:<|at position)/);
                    if (match) {
                        player = match[1];
                        action = match[2];
                        item = match[3].trim();
                    } else {
                        // Try: Player "name" (id=X) dismantled/Built ITEM
                        match = line.match(/Player \"(.+?)\"\s*\(id=[^)]*\)\s*([Dd]ismantled|[Bb]uilt)\s+(.+)/);
                        if (match) {
                            player = match[1];
                            action = match[2].toLowerCase();
                            item = match[3].replace(/<.*$/, '').trim();
                        }
                    }
                }
                
                // ALWAYS add event if keyword was found, parsing is just for formatting
                events.push({
                    type: 'build',
                    time: time,
                    player: player,
                    action: action,
                    item: item,
                    raw: line
                });
            }
        }
        
        return events;
    }

    async postEventToGuild(guildConfig, event) {
        try {
            console.log(`[MULTI-KILLFEED] postEventToGuild called for guild ${guildConfig.guild_id}, event type: ${event.type}`);
            
            let channelId;
            
            // Route to appropriate channel based on event type
            if (event.type === 'connected' || event.type === 'disconnected') {
                channelId = guildConfig.connections_channel_id;
            } else if (event.type === 'suicide') {
                channelId = guildConfig.suicide_channel_id || guildConfig.killfeed_channel_id;
            } else if (event.type === 'build') {
                channelId = guildConfig.build_channel_id || guildConfig.killfeed_channel_id;
            } else {
                // kills and hits go to killfeed
                channelId = guildConfig.killfeed_channel_id;
            }
            
            console.log(`[MULTI-KILLFEED] Using channel ID: ${channelId}`);
            
            if (!channelId) {
                console.log(`[MULTI-KILLFEED] No channel ID for event type ${event.type}, skipping`);
                return;
            }
            
            let channel;
            try {
                channel = await this.bot.channels.fetch(channelId);
            } catch (error) {
                console.log(`[MULTI-KILLFEED] Channel ${channelId} not found (${error.message}), trying killfeed fallback`);
                // If build/suicide channel doesn't exist, fall back to killfeed
                if (event.type === 'build' || event.type === 'suicide') {
                    channelId = guildConfig.killfeed_channel_id;
                    try {
                        channel = await this.bot.channels.fetch(channelId);
                        console.log(`[MULTI-KILLFEED] Using killfeed channel ${channelId} as fallback`);
                    } catch (e) {
                        console.log(`[MULTI-KILLFEED] Killfeed channel also not found, skipping`);
                        return;
                    }
                } else {
                    return;
                }
            }
            
            if (!channel) {
                console.log(`[MULTI-KILLFEED] Channel ${channelId} not found, skipping`);
                return;
            }
            
            console.log(`[MULTI-KILLFEED] Channel found: ${channel.name}, preparing embed...`);
            
            let embed = new MessageEmbed().setTimestamp();
            
            if (event.type === 'kill') {
                // Calculate distance if available from weapon info
                const distance = event.weapon ? this.extractDistance(event.weapon) : null;
                let killTitle = '⚔️ SLAIN IN BATTLE ⚔️';
                
                if (distance !== null) {
                    if (distance <= 10) killTitle = '🗡️ CLOSE QUARTERS COMBAT 🗡️';
                    else if (distance <= 100) killTitle = '⚔️ SKIRMISH ⚔️';
                    else if (distance <= 300) killTitle = '🏹 MARKSMAN\'S SHOT 🏹';
                    else killTitle = '🎯 LEGENDARY SNIPER 🎯';
                }
                
                embed.setColor('#8B0000') // Dark red
                    .setTitle(killTitle);
                
                if (event.victim && event.killer) {
                    const medievalWeapon = this.translateWeaponToMedieval(event.weapon);
                    const distanceText = distance !== null ? ` (${distance}m)` : '';
                    
                    embed.setDescription(`\`\`\`diff\n- ${event.victim}\n\`\`\`\n⚔️ **Vanquished by:** \`${event.killer}\``);
                    if (medievalWeapon) {
                        embed.addFields({ name: '🗡️ Weapon of Choice', value: `\`${medievalWeapon}\`${distanceText}`, inline: true });
                    }
                    embed.addFields({ name: '🕐 Time of Battle', value: `\`${event.time}\``, inline: true });
                    
                    // Add position if enabled and available
                    if (guildConfig.show_death_locations && event.position) {
                        const mapUrl = this.getMapUrl(guildConfig.map_name, event.position);
                        embed.addFields({ name: '📍 Location', value: mapUrl || `\`${Math.round(event.position.x)}, ${Math.round(event.position.z)}\``, inline: false });
                    }
                    
                    // Auto-ban killer if enabled (PVE mode) - but only for player-vs-player kills
                    // Skip grenades, zombies, environmental deaths, and suicides
                    if (guildConfig.auto_ban_on_kill && event.isPlayerKill && event.killer && event.victim) {
                        // Skip if suicide (killer = victim)
                        if (event.killer === event.victim) {
                            console.log(`[AUTO-BAN] ${event.killer} committed suicide, no ban`);
                        } else {
                            // Check if kill is in a PVP safe zone
                            const inPvpZone = event.position && this.isInPvpZone(guildConfig, event.position);
                            
                            if (inPvpZone) {
                                console.log(`[AUTO-BAN] Kill by ${event.killer} is in PVP zone, no ban`);
                            } else {
                                console.log(`[AUTO-BAN] PVE mode enabled - attempting to ban player ${event.killer}`);
                                try {
                                    await this.banPlayerOnNitrado(guildConfig, event.killer);
                                    embed.setColor('#FF0000'); // Bright red for PVE violation
                                    embed.addFields({ name: '⚠️ PVE VIOLATION', value: `**${event.killer}** has been automatically banned for PVP on a PVE server!`, inline: false });
                                    console.log(`[AUTO-BAN] Successfully banned ${event.killer}`);
                                } catch (error) {
                                    console.error(`[AUTO-BAN] Failed to ban ${event.killer}:`, error.message);
                                    embed.addFields({ name: '❌ Auto-Ban Failed', value: `Could not ban ${event.killer}: ${error.message}`, inline: false });
                                }
                            }
                        }
                    }
                    
                    // Check for safe zone violations on PVP servers - only for player-vs-player kills
                    if (guildConfig.auto_ban_in_safe_zones && event.isPlayerKill && event.killer && event.victim) {
                        // Skip if suicide (killer = victim)
                        if (event.killer === event.victim) {
                            console.log(`[SAFE-ZONE] ${event.killer} committed suicide, no violation`);
                        } else {
                            // Check if kill happened in a safe zone
                            const safeZoneName = event.position && this.isInSafeZone(guildConfig, event.position);
                            
                            if (safeZoneName) {
                                console.log(`[SAFE-ZONE] Kill by ${event.killer} in safe zone: ${safeZoneName} - attempting ban`);
                                try {
                                    await this.banPlayerOnNitrado(guildConfig, event.killer);
                                    embed.setColor('#FF0000'); // Bright red for safe zone violation
                                    embed.addFields({ name: '🚫 SAFE ZONE VIOLATION', value: `**${event.killer}** has been automatically banned for PVP in **${safeZoneName}**!`, inline: false });
                                    console.log(`[SAFE-ZONE] Successfully banned ${event.killer}`);
                                } catch (error) {
                                    console.error(`[SAFE-ZONE] Failed to ban ${event.killer}:`, error.message);
                                    embed.addFields({ name: '❌ Auto-Ban Failed', value: `Could not ban ${event.killer}: ${error.message}`, inline: false });
                                }
                            }
                        }
                    }
                } else {
                    embed.setDescription(`\`\`\`\n${event.raw}\n\`\`\``);
                }
            } else if (event.type === 'hit') {
                embed.setColor('#FF8C00') // Dark orange
                    .setTitle('🎯 WOUNDED IN COMBAT 🎯');
                
                if (event.victim && event.source) {
                    embed.setDescription(`🩸 **${event.victim}**\n\`\`\`fix\nStruck by: ${event.source}\n\`\`\``);
                    embed.addFields({ name: '🕐 Time', value: `\`${event.time}\``, inline: true });
                } else {
                    embed.setDescription(`\`\`\`\n${event.raw}\n\`\`\``);
                }
            } else if (event.type === 'connected') {
                embed.setColor('#FFD700') // Gold
                    .setTitle('🏰 ARRIVED AT THE REALM 🏰');
                
                if (event.player) {
                    embed.setDescription(`\`\`\`diff\n+ ${event.player}\n\`\`\`\n⚜️ **Welcome to the Kingdom, traveler!**`);
                    embed.addFields({ name: '🕐 Time', value: `\`${event.time}\``, inline: true });
                    
                    console.log(`[DISTANCE] Player ${event.player} connected - session will be created on first position update`);
                } else {
                    embed.setDescription(`\`\`\`\n${event.raw}\n\`\`\``);
                }
            } else if (event.type === 'disconnected') {
                embed.setColor('#9370DB') // Medium purple
                    .setTitle('🚪 DEPARTED THE REALM 🚪');
                
                if (event.player) {
                    // Calculate distance earnings
                    let distanceInfo = '';
                    try {
                        console.log(`[DISTANCE] Processing disconnect for ${event.player} in guild ${guildConfig.guild_id}`);
                        const totalDistance = await db.endPlayerSession(guildConfig.guild_id, event.player);
                        console.log(`[DISTANCE] Total distance for ${event.player}: ${totalDistance}m`);
                        
                        if (totalDistance > 0) {
                            const distanceKm = (totalDistance / 1000).toFixed(2);
                            const distanceM = Math.round(totalDistance);
                            
                            // Reward: $1 per 100 meters
                            const earned = Math.floor(totalDistance / 100);
                            
                            if (earned > 0) {
                                const userId = await db.getUserIdByDayZName(guildConfig.guild_id, event.player);
                                console.log(`[DISTANCE] User ID for ${event.player}: ${userId}`);
                                if (userId) {
                                    await db.addBalance(guildConfig.guild_id, userId, earned);
                                    console.log(`[DISTANCE] Awarded $${earned} to ${event.player} (${userId})`);
                                    distanceInfo = `\n\n🗺️ **Journey Traveled:** ${distanceM}m (${distanceKm}km)\n💰 **Gold Earned:** $${earned}`;
                                } else {
                                    console.log(`[DISTANCE] ${event.player} not registered`);
                                    distanceInfo = `\n\n🗺️ **Journey Traveled:** ${distanceM}m (${distanceKm}km)\n⚠️ Register with /register to earn $${earned} gold`;
                                }
                            } else {
                                distanceInfo = `\n\n🗺️ **Journey Traveled:** ${distanceM}m (${distanceKm}km)`;
                            }
                        } else {
                            console.log(`[DISTANCE] No distance tracked for ${event.player}`);
                        }
                    } catch (err) {
                        console.error(`[DISTANCE] Error calculating earnings: ${err.message}`);
                        console.error(`[DISTANCE] Stack: ${err.stack}`);
                    }
                    
                    embed.setDescription(`\`\`\`diff\n- ${event.player}\n\`\`\`\n👋 **The traveler's journey has ended**${distanceInfo}`);
                    embed.addFields({ name: '🕐 Time', value: `\`${event.time}\``, inline: true });
                } else {
                    embed.setDescription(`\`\`\`\n${event.raw}\n\`\`\``);
                }
            } else if (event.type === 'suicide') {
                embed.setColor('#2F4F4F') // Dark slate gray
                    .setTitle('⚰️ MET AN UNTIMELY END ⚰️');
                
                if (event.player) {
                    embed.setDescription(`\`\`\`fix\n${event.player}\n\`\`\`\n🕯️ **${event.player} perished by their own hand**`);
                    embed.addFields({ name: '🕐 Time', value: `\`${event.time}\``, inline: true });
                    
                    // Add position if enabled and available
                    if (guildConfig.show_death_locations && event.position) {
                        const mapUrl = this.getMapUrl(guildConfig.map_name, event.position);
                        embed.addFields({ name: '📍 Location', value: mapUrl || `\`${Math.round(event.position.x)}, ${Math.round(event.position.z)}\``, inline: false });
                    }
                } else {
                    embed.setDescription(`\`\`\`\n${event.raw}\n\`\`\``);
                }
            } else if (event.type === 'build') {
                const actionEmoji = {
                    'placed': '📦',
                    'raised': '⬆️',
                    'dismantled': '💥',
                    'built': '🏗️'
                };
                const medievalActions = {
                    'placed': 'Erected',
                    'raised': 'Fortified',
                    'dismantled': 'Razed',
                    'built': 'Constructed'
                };
                
                const emoji = actionEmoji[event.action?.toLowerCase()] || '⚒️';
                const actionText = medievalActions[event.action?.toLowerCase()] || event.action;
                
                embed.setColor('#8B4513') // Brown
                    .setTitle(`${emoji} ⚒️ BUILDING THE KINGDOM ⚒️ ${emoji}`);
                
                if (event.player && event.action && event.item) {
                    embed.setDescription(`🏗️ **${event.player}**\n\`\`\`yaml\n${actionText ? actionText.toUpperCase() : event.action.toUpperCase()}: ${event.item}\n\`\`\``);
                    embed.addFields({ name: '🕐 Time', value: `\`${event.time}\``, inline: true });
                } else {
                    embed.setDescription(`\`\`\`\n${event.raw}\n\`\`\``);
                }
            }
            
            console.log(`[MULTI-KILLFEED] Sending embed to channel ${channelId}...`);
            await channel.send({ embeds: [embed] });
            console.log(`[MULTI-KILLFEED] Successfully posted ${event.type} event to guild ${guildConfig.guild_id}`);
        } catch (error) {
            console.error(`[MULTI-KILLFEED] Error posting event for guild ${guildConfig.guild_id}:`, error.message);
            console.error(`[MULTI-KILLFEED] Error stack:`, error.stack);
        }
    }

    // Helper function to check if a position is inside a PVP safe zone
    isInPvpZone(guildConfig, position) {
        const zones = guildConfig.pvp_zones || [];
        if (zones.length === 0) return false;
        
        const x = position.x;
        const z = position.z;
        
        for (const zone of zones) {
            // Check if position is within rectangular zone bounds
            const minX = Math.min(zone.x1, zone.x2);
            const maxX = Math.max(zone.x1, zone.x2);
            const minZ = Math.min(zone.z1, zone.z2);
            const maxZ = Math.max(zone.z1, zone.z2);
            
            if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
                console.log(`[PVP-ZONE] Position (${x}, ${z}) is in PVP zone: ${zone.name}`);
                return true;
            }
        }
        
        return false;
    }

    isInSafeZone(guildConfig, position) {
        const zones = guildConfig.safe_zones || [];
        if (zones.length === 0) return false;
        
        const x = position.x;
        const z = position.z;
        
        for (const zone of zones) {
            // Check if position is within rectangular zone bounds
            const minX = Math.min(zone.x1, zone.x2);
            const maxX = Math.max(zone.x1, zone.x2);
            const minZ = Math.min(zone.z1, zone.z2);
            const maxZ = Math.max(zone.z1, zone.z2);
            
            if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
                console.log(`[SAFE-ZONE] Position (${x}, ${z}) is in safe zone: ${zone.name}`);
                return zone.name; // Return zone name for display
            }
        }
        
        return false;
    }

    // Helper function to check if a name is a player (not zombie/animal)
    isPlayerName(name) {
        if (!name) return false;
        
        // Filter out zombies (ZmbM_, ZmbF_), animals (Animal_), and other AI
        const aiPatterns = [
            /^Zmb[MF]_/i,           // Zombies: ZmbM_*, ZmbF_*
            /^Animal_/i,            // Animals: Animal_*
            /^Infected/i,           // Infected
            /^Wolf/i,               // Wolves
            /^Bear/i,               // Bears
            /^Boar/i,               // Boars
            /^Chicken/i,            // Chickens
            /^Cow/i,                // Cows
            /^Goat/i,               // Goats
            /^Pig/i,                // Pigs
            /^Sheep/i,              // Sheep
            /^ZmbM|ZmbF/i           // Alternative zombie pattern
        ];
        
        for (const pattern of aiPatterns) {
            if (pattern.test(name)) {
                console.log(`[AUTO-BAN] Skipping AI/zombie: ${name}`);
                return false;
            }
        }
        
        return true; // It's a player name
    }

    // Helper function to extract distance from weapon string
    extractDistance(weaponString) {
        if (!weaponString) return null;
        const match = weaponString.match(/\((\d+)m\)/);
        return match ? parseInt(match[1]) : null;
    }

    // Helper function to translate modern weapons to medieval equivalents
    translateWeaponToMedieval(weapon) {
        if (!weapon) return null;
        
        const weaponLower = weapon.toLowerCase();
        
        // Firearms → Medieval ranged
        if (weaponLower.includes('m4') || weaponLower.includes('ak') || weaponLower.includes('rifle')) {
            return '🏹 Arquebus';
        }
        if (weaponLower.includes('mosin') || weaponLower.includes('svd') || weaponLower.includes('tundra')) {
            return '🎯 Longbow';
        }
        if (weaponLower.includes('shotgun') || weaponLower.includes('izh')) {
            return '💥 Blunderbuss';
        }
        if (weaponLower.includes('pistol') || weaponLower.includes('deagle') || weaponLower.includes('mkii')) {
            return '🔫 Hand Cannon';
        }
        
        // Melee weapons
        if (weaponLower.includes('knife') || weaponLower.includes('blade')) {
            return '🗡️ Dagger';
        }
        if (weaponLower.includes('axe') || weaponLower.includes('hatchet')) {
            return '🪓 Battle Axe';
        }
        if (weaponLower.includes('bat') || weaponLower.includes('pipe') || weaponLower.includes('crowbar')) {
            return '🔨 Mace';
        }
        if (weaponLower.includes('shovel') || weaponLower.includes('pickaxe')) {
            return '⛏️ Warhammer';
        }
        
        // Explosives
        if (weaponLower.includes('grenade') || weaponLower.includes('explosive')) {
            return '💣 Alchemist\'s Fire';
        }
        
        // Vehicle/Environment
        if (weaponLower.includes('car') || weaponLower.includes('vehicle')) {
            return '🐎 Cavalry Charge';
        }
        if (weaponLower.includes('fall') || weaponLower.includes('falling')) {
            return '🏔️ Fell from Heights';
        }
        
        // Default - clean up the weapon name
        return weapon.replace(/\(.*?\)/g, '').trim() || weapon;
    }

    // Helper function to generate map URLs for positions
    getMapUrl(mapName, position) {
        if (!position || !position.x || !position.z) return null;
        
        const x = Math.round(position.x);
        const y = Math.round(position.y);
        const z = Math.round(position.z);
        
        // Map name to iZurvive URLs
        let baseUrl;
        if (mapName === 'enoch') {
            baseUrl = 'https://www.izurvive.com/livonia/#location=';
        } else if (mapName === 'sakhal') {
            baseUrl = 'https://www.izurvive.com/sakhal/#location=';
        } else {
            // chernarusplus or default
            baseUrl = 'https://www.izurvive.com/#location=';
        }
        
        // Format: X;Y;Z
        const coords = `${x};${y};${z}`;
        const url = `${baseUrl}${coords}`;
        
        return `[${x}, ${z}](${url})`;
    }

    stop() {
        this.isRunning = false;
        console.log('[MULTI-KILLFEED] Stopped multi-guild killfeed monitoring');
    }

    async parseAndUpdateLocations(guildId, logData) {
        try {
            const logString = typeof logData === 'string' ? logData : String(logData);
            const lines = logString.split(/\r?\n/);
            let locationCount = 0;
            let distanceUpdateCount = 0;
            
            for (const line of lines) {
                const locInfo = this.parsePlayerLocation(line);
                if (locInfo) {
                    await db.setPlayerLocation(guildId, locInfo.name, locInfo.position.x, locInfo.position.y, locInfo.position.z);
                    // Also update distance tracking for active sessions
                    const distance = await db.updatePlayerDistance(guildId, locInfo.name, locInfo.position.x, locInfo.position.y, locInfo.position.z);
                    if (distance === null) {
                        // Session doesn't exist yet - create it now
                        await db.startPlayerSession(guildId, locInfo.name, locInfo.position.x, locInfo.position.y, locInfo.position.z);
                        console.log(`[DISTANCE] Auto-created session for ${locInfo.name} at position`);
                    } else if (distance > 0) {
                        distanceUpdateCount++;
                    }
                    locationCount++;
                }
            }
            
            if (locationCount > 0) {
                console.log(`[LOCATION] Guild ${guildId}: Updated ${locationCount} player locations (${distanceUpdateCount} with distance)`);
            }
        } catch (error) {
            console.error(`[LOCATION] Guild ${guildId}: Error updating locations:`, error.message);
        }
    }

    parsePlayerLocation(logEntry) {
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

    async checkRestartWindow(guildConfig, state, logData) {
        const restartHours = guildConfig.restart_hours ? guildConfig.restart_hours.split(',').map(h => parseInt(h.trim())) : [3, 9, 15, 21];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Check if we're in a cleanup window (15-25 minutes after restart to allow server to fully restart and load spawn.json)
        for (const restartHour of restartHours) {
            if (currentHour === restartHour && currentMinutes >= 15 && currentMinutes <= 25) {
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
    
    // Ban a player on Nitrado server
    async banPlayerOnNitrado(guildConfig, playerName) {
        try {
            const FormData = require('form-data');
            const concat = require('concat-stream');
            
            // First, get current banlist
            const getUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
            const getResponse = await axios.get(getUrl, {
                headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
            });
            
            const settings = getResponse.data.data.settings;
            let currentBanlist = settings.general?.bans || '';
            
            // Check if already banned
            if (currentBanlist.includes(playerName)) {
                console.log(`[AUTO-BAN] ${playerName} is already in banlist`);
                return;
            }
            
            // Add to banlist
            const newBanlist = currentBanlist ? `${currentBanlist}\n${playerName}` : playerName;
            
            // Update on Nitrado
            const formData = new FormData();
            formData.append("category", "general");
            formData.append("key", "bans");
            formData.append("value", newBanlist);
            
            const headers = {
                ...formData.getHeaders(),
                "Authorization": `Bearer ${guildConfig.nitrado_token}`,
            };
            
            const postUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
            
            return new Promise((resolve, reject) => {
                formData.pipe(concat(async (data) => {
                    try {
                        const response = await axios.post(postUrl, data, { headers });
                        if (response.status >= 200 && response.status < 300) {
                            console.log(`[AUTO-BAN] Successfully added ${playerName} to banlist`);
                            resolve();
                        } else {
                            reject(new Error(`HTTP ${response.status}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                }));
            });
        } catch (error) {
            console.error(`[AUTO-BAN] Error banning ${playerName}:`, error.message);
            throw error;
        }
    }
}

module.exports = MultiGuildKillfeed;
