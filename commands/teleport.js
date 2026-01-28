const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions, MessageActionRow, MessageSelectMenu, MessageButton, Modal, TextInputComponent } = require('discord.js');
const db = require('../database.js');
const fs = require('fs');
const config = fs.existsSync('./config.json') ? require('../config.json') : {};
const axios = require('axios');

function getPlatformPath(platform) {
    if (!platform) return 'dayzps';
    const plat = platform.toUpperCase();
    if (plat === 'XBOX' || plat === 'XB') return 'dayzxb';
    if (plat === 'PS4' || plat === 'PS5' || plat === 'PLAYSTATION') return 'dayzps';
    return 'dayzstandalone';
}

// Store last /imhere coordinates per user
const lastCoordinates = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('teleport')
        .setDescription('Manage teleport zones and routes (Admin only)'),
    
    async execute(interaction) {
        // Check admin permission
        if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            return interaction.reply({ content: '❌ You need Administrator permission to use this command.', ephemeral: true });
        }

        // Show action menu
        const menu = new MessageSelectMenu()
            .setCustomId('teleport_action')
            .setPlaceholder('Select an action')
            .addOptions([
                {
                    label: '🆕 Create Zone',
                    description: 'Create a new teleport zone',
                    value: 'create_zone'
                },
                {
                    label: '📍 Create Route',
                    description: 'Create a new teleport route between two locations',
                    value: 'create_route'
                },
                {
                    label: '✏️ Update Zone',
                    description: 'Update zone coordinates',
                    value: 'update_zone'
                },
                {
                    label: '🗑️ Delete Route',
                    description: 'Delete a teleport route',
                    value: 'delete_route'
                },
                {
                    label: '🗑️ Delete Zone',
                    description: 'Delete a zone and all its routes',
                    value: 'delete_zone'
                },
                {
                    label: '📋 List Zones',
                    description: 'View all teleport zones',
                    value: 'list_zones'
                },
                {
                    label: '📋 List Routes',
                    description: 'View all teleport routes',
                    value: 'list_routes'
                }
            ]);

        const row = new MessageActionRow().addComponents(menu);

        // Defer immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        await interaction.editReply({
            content: '**Teleport Management**\nSelect an action:',
            components: [row]
        });
    },

    async handleSelectMenu(interaction) {
        const action = interaction.values[0];

        // Handle different select menu types
        if (interaction.customId === 'teleport_action') {
            // For create_zone, DON'T defer - we need to show modal immediately
            if (action === 'create_zone') {
                await this.startZoneCreation(interaction);
                return;
            }
            
            // For all other actions, defer to prevent timeout
            await interaction.deferUpdate();
            
            switch (action) {
                case 'create_route':
                    await this.startRouteCreation(interaction);
                    break;
                case 'update_zone':
                    await this.startZoneUpdate(interaction);
                    break;
                case 'delete_route':
                    await this.startRouteDelete(interaction);
                    break;
                case 'delete_zone':
                    await this.startZoneDelete(interaction);
                    break;
                case 'list_zones':
                    await this.listZones(interaction);
                    break;
                case 'list_routes':
                    await this.listRoutes(interaction);
                    break;
            }
        } else {
            // Defer for other select menus
            await interaction.deferUpdate();
            
            if (interaction.customId === 'teleport_coords_method_select') {
                await this.handleCoordsMethodSelect(interaction);
            } else if (interaction.customId === 'teleport_zone_update_select') {
                await this.handleZoneUpdateSelect(interaction);
            } else if (interaction.customId === 'teleport_route_delete_select') {
                await this.handleRouteDeleteSelect(interaction);
            } else if (interaction.customId === 'teleport_zone_delete_select') {
                await this.handleZoneDeleteSelect(interaction);
            }
        }
    },

    async handleButton(interaction) {
        const [action, ...params] = interaction.customId.split('|');

        // For buttons that show modals, DON'T defer - show modal immediately
        if (action === 'manual_coords' || action === 'manual_zone_coords') {
            if (action === 'manual_coords') {
                const [fromZoneName, toZoneName, serverName, zoneName] = params;
                await this.askForManualCoordinates(interaction, fromZoneName, toZoneName, serverName, zoneName);
            } else if (action === 'manual_zone_coords') {
                const [serverName, zoneName] = params;
                await this.askForManualZoneCoordinates(interaction, serverName, zoneName);
            }
            return;
        }
        
        // For other buttons, defer to prevent timeout
        await interaction.deferUpdate();
        
        if (action === 'cancel_route') {
            await interaction.editReply({ content: '❌ Route creation cancelled.', components: [] });
        } else if (action === 'cancel_zone') {
            await interaction.editReply({ content: '❌ Zone creation cancelled.', components: [] });
        }
    },

    async handleZoneUpdateSelect(interaction) {
        const [zoneName, server] = interaction.values[0].split('|');
        
        // Check for coordinates
        const coords = this.getLastCoordinates(interaction.user.id);
        
        if (!coords) {
            return interaction.editReply({
                content: `❌ No recent coordinates found!\n\n🎯 Use \`/imhere\` at the new location for **${zoneName}**, then try again.`,
                components: []
            });
        }

        // Update zone
        await db.query(
            'UPDATE teleport_zones SET x = $1, y = $2, z = $3, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $4 AND server = $5 AND zone_name = $6',
            [coords.x, coords.y, coords.z, interaction.guild.id, server, zoneName]
        );

        // Re-upload all routes using this zone
        await this.updateRoutesForZone(interaction.guild.id, server, zoneName);

        await interaction.editReply({
            content: `✅ **Zone Updated!**\n\n**${zoneName}** on **${server}**\nNew coordinates: [${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}, ${coords.z.toFixed(1)}]\n\n⚠️ **All routes using this zone have been updated. Restart server to apply!**`,
            components: []
        });
    },

    async handleRouteDeleteSelect(interaction) {
        const [fromZone, toZone, server] = interaction.values[0].split('|');
        
        // Get route info
        const routeData = await db.query(
            'SELECT file_name FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND from_zone_name = $3 AND to_zone_name = $4',
            [interaction.guild.id, server, fromZone, toZone]
        );

        if (routeData.rows.length === 0) {
            return interaction.editReply({ content: '❌ Route not found!', components: [] });
        }

        const fileName = routeData.rows[0].file_name;

        // Delete from Nitrado
        await this.deleteFromNitrado(interaction.guild.id, server, fileName);

        // Remove from cfggameplay
        await this.removeFromCfgGameplay(interaction.guild.id, server, fileName);

        // Delete from database
        await db.query(
            'DELETE FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND from_zone_name = $3 AND to_zone_name = $4',
            [interaction.guild.id, server, fromZone, toZone]
        );

        await interaction.editReply({
            content: `✅ **Route Deleted!**\n\n**${fromZone}** → **${toZone}** on **${server}**\n\n⚠️ **Restart server to apply changes!**`,
            components: []
        });
    },

    async handleZoneDeleteSelect(interaction) {
        const [zoneName, server] = interaction.values[0].split('|');
        
        // Get all routes using this zone
        const routes = await db.query(
            'SELECT file_name FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND (from_zone_name = $3 OR to_zone_name = $3)',
            [interaction.guild.id, server, zoneName]
        );

        // Delete all route files from Nitrado
        for (const route of routes.rows) {
            await this.deleteFromNitrado(interaction.guild.id, server, route.file_name);
            await this.removeFromCfgGameplay(interaction.guild.id, server, route.file_name);
        }

        // Delete routes from database
        await db.query(
            'DELETE FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND (from_zone_name = $3 OR to_zone_name = $3)',
            [interaction.guild.id, server, zoneName]
        );

        // Delete zone from database
        await db.query(
            'DELETE FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND zone_name = $3',
            [interaction.guild.id, server, zoneName]
        );

        await interaction.editReply({
            content: `✅ **Zone Deleted!**\n\n**${zoneName}** on **${server}**\n**${routes.rows.length}** routes deleted.\n\n⚠️ **Restart server to apply changes!**`,
            components: []
        });
    },

    async updateRoutesForZone(guildId, server, zoneName) {
        // Get all routes using this zone
        const routes = await db.query(
            'SELECT from_zone_name, to_zone_name, file_name FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND (from_zone_name = $3 OR to_zone_name = $3)',
            [guildId, server, zoneName]
        );

        for (const route of routes.rows) {
            // Get both zones
            const zones = await db.query(
                'SELECT zone_name, x, y, z FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND zone_name IN ($3, $4)',
                [guildId, server, route.from_zone_name, route.to_zone_name]
            );

            const fromZone = zones.rows.find(z => z.zone_name === route.from_zone_name);
            const toZone = zones.rows.find(z => z.zone_name === route.to_zone_name);

            if (!fromZone || !toZone) continue;

            // Regenerate JSON
            const teleportJson = {
                PRABoxes: [
                    {
                        type: "Box",
                        points: [
                            { x: fromZone.x, z: fromZone.y, y: fromZone.z }
                        ],
                        size: { x: 27, z: 5.2, y: 11 },
                        rotation: { x: 108, z: 0, y: 0 },
                        display: `${route.from_zone_name} to ${route.to_zone_name}`,
                        allowedWeapons: 0,
                        schedule: 0,
                        trespassWarning: 1,
                        bannedWeapons: [],
                        safePositions3D: [
                            { x: toZone.x, z: toZone.y, y: toZone.z }
                        ]
                    }
                ]
            };

            // Re-upload
            await this.uploadToNitrado(guildId, server, route.file_name, teleportJson);
        }
    },

    async deleteFromNitrado(guildId, server, fileName) {
        try {
            const guildConfig = await db.query(
                'SELECT nitrado_token, nitrado_service_id, nitrado_instance FROM guild_configs WHERE guild_id = $1',
                [guildId]
            );

            if (guildConfig.rows.length === 0) {
                return false;
            }

            const { nitrado_token, nitrado_service_id: server_id, nitrado_instance, platform } = guildConfig.rows[0];

            const headers = {
                'Authorization': `Bearer ${nitrado_token}`,
                'Content-Type': 'application/json'
            };

            const platformPath = getPlatformPath(platform);
            const filePath = `/games/${nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${server}/custom/${fileName}`;

            await axios.delete(
                `https://api.nitrado.net/services/${server_id}/gameservers/file_server/delete`,
                {
                    headers,
                    data: { path: filePath }
                }
            );

            console.log(`[TELEPORT] Deleted ${fileName} for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error('[TELEPORT] Delete error:', error.response?.data || error.message);
            return false;
        }
    },

    async removeFromCfgGameplay(guildId, server, fileName) {
        try {
            const guildConfig = await db.query(
                'SELECT nitrado_token, nitrado_service_id, nitrado_instance, platform FROM guild_configs WHERE guild_id = $1',
                [guildId]
            );

            if (guildConfig.rows.length === 0) {
                return false;
            }

            const { nitrado_token, nitrado_service_id: server_id, nitrado_instance, platform } = guildConfig.rows[0];

            const headers = {
                'Authorization': `Bearer ${nitrado_token}`,
                'Content-Type': 'application/json'
            };

            const platformPath = getPlatformPath(platform);
            // Download current cfggameplay.json
            const cfgGameplayPath = `/games/${nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${server}/cfggameplay.json`;
            const downloadResponse = await axios.get(
                `https://api.nitrado.net/services/${server_id}/gameservers/file_server/download?file=${encodeURIComponent(cfgGameplayPath)}`,
                { headers }
            );

            const fileUrl = downloadResponse.data.data.token.url;
            const fileResp = await axios.get(fileUrl);
            let cfgGameplay = fileResp.data;
            
            if (typeof cfgGameplay === 'string') {
                cfgGameplay = JSON.parse(cfgGameplay);
            }

            // Remove from playerRestrictedAreaFiles array
            if (cfgGameplay.WorldsData?.playerRestrictedAreaFiles) {
                const customPath = `custom/${fileName}`;
                cfgGameplay.WorldsData.playerRestrictedAreaFiles = cfgGameplay.WorldsData.playerRestrictedAreaFiles.filter(
                    file => file !== customPath
                );
            }

// Get FTP credentials and upload modified cfggameplay.json
        const infoUrl = `https://api.nitrado.net/services/${server_id}/gameservers`;
        const infoResp = await axios.get(infoUrl, { headers });
        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;

        const { Client } = require('basic-ftp');
        const client = new Client();
        await client.access({
            host: ftpCreds.hostname,
            user: ftpCreds.username,
            password: ftpCreds.password,
            port: ftpCreds.port || 21,
            secure: false
        });

        const tmpPath = path.join(__dirname, '..', 'logs', `cfggameplay_delete_${Date.now()}.json`);
        fs.writeFileSync(tmpPath, JSON.stringify(cfgGameplay, null, 4), 'utf8');
        await client.uploadFrom(tmpPath, `/${platformPath}_missions/dayzOffline.${server}/cfggameplay.json`);
        fs.unlinkSync(tmpPath);
        client.close();

            console.log(`[TELEPORT] Removed ${fileName} from cfggameplay.json for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error('[TELEPORT] cfggameplay removal error:', error.response?.data || error.message);
            return false;
        }
    },

    async startRouteCreation(interaction) {
        // Interaction already deferred in handleSelectMenu
        
        // Get server from guild config
        const guildConfig = await db.query(
            'SELECT map_name FROM guild_configs WHERE guild_id = $1',
            [interaction.guild.id]
        );

        if (guildConfig.rows.length === 0) {
            return interaction.editReply({
                content: '❌ No server configured! Please run `/admin setup` first.',
                components: []
            });
        }

        const serverName = guildConfig.rows[0].map_name;

        await interaction.editReply({
            content: `**Create Teleport Route - Step 1/2**\n\n` +
                `📍 Please type the **starting zone name**:\n\n` +
                `**Example:** \`krona\`\n\n` +
                `**Zone names:** lowercase, alphanumeric, underscore, dash only\n` +
                `**Server:** ${serverName}\n\n` +
                `⏱️ You have 60 seconds to respond...`,
            components: []
        });

        // Create message collector
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async (message) => {
            const fromZoneName = message.content.toLowerCase().trim();

            // Validate zone name
            if (!/^[a-z0-9_-]+$/.test(fromZoneName)) {
                return message.reply('❌ Zone name must be lowercase alphanumeric, underscore, or dash only!');
            }

            // Delete user's message
            try { await message.delete(); } catch (e) {}

            // Ask for destination zone
            await this.askForDestinationZone(interaction, message.channel, fromZoneName, serverName);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                interaction.channel.send(`⏱️ <@${interaction.user.id}> Route creation timed out. Please try again.`);
            }
        });
    },

    async askForDestinationZone(interaction, channel, fromZoneName, serverName) {
        const msg = await channel.send({
            content: `**Create Teleport Route - Step 2/2**\n\n` +
                `✅ Starting zone: **${fromZoneName}**\n` +
                `✅ Server: **${serverName}**\n\n` +
                `📍 Now type the **destination zone name**:\n\n` +
                `**Example:** \`devil\`\n\n` +
                `⏱️ You have 60 seconds to respond...`
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async (message) => {
            const toZoneName = message.content.toLowerCase().trim();

            // Validate zone name
            if (!/^[a-z0-9_-]+$/.test(toZoneName)) {
                return message.reply('❌ Zone name must be lowercase alphanumeric, underscore, or dash only!');
            }

            // Delete user's message
            try { await message.delete(); } catch (e) {}
            try { await msg.delete(); } catch (e) {}

            // Check if route already exists
            const existingRoute = await db.query(
                'SELECT 1 FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND from_zone_name = $3 AND to_zone_name = $4',
                [interaction.guild.id, serverName, fromZoneName, toZoneName]
            );

            if (existingRoute.rows.length > 0) {
                return channel.send(`❌ <@${interaction.user.id}> Route **${fromZoneName}** → **${toZoneName}** already exists on **${serverName}**!`);
            }

            // Process zones and create route
            await this.processRouteCreation(interaction, channel, fromZoneName, toZoneName, serverName);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                channel.send(`⏱️ <@${interaction.user.id}> Route creation timed out. Please try again.`);
                try { msg.delete(); } catch (e) {}
            }
        });
    },

    async processRouteCreation(interaction, channel, fromZoneName, toZoneName, serverName) {
        const statusMsg = await channel.send(`**Create Teleport Route - Step 3/3**\n\n🔄 Checking zones...`);

        // Check which zones exist
        const zones = await db.query(
            'SELECT zone_name, x, y, z FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND (zone_name = $3 OR zone_name = $4)',
            [interaction.guild.id, serverName, fromZoneName, toZoneName]
        );

        const existingZones = new Map(zones.rows.map(z => [z.zone_name, z]));
        const missingZones = [];

        if (!existingZones.has(fromZoneName)) missingZones.push(fromZoneName);
        if (!existingZones.has(toZoneName)) missingZones.push(toZoneName);

        // If zones are missing, offer coordinate input options
        if (missingZones.length > 0) {
            const coords = this.getLastCoordinates(interaction.user.id);
            
            if (!coords) {
                // Offer manual coordinate entry
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`manual_coords|${fromZoneName}|${toZoneName}|${serverName}|${missingZones[0]}`)
                            .setLabel('✏️ Enter Coordinates')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId('cancel_route')
                            .setLabel('❌ Cancel')
                            .setStyle('SECONDARY')
                    );

                return statusMsg.edit({
                    content: `⚠️ **Missing Zone: ${missingZones[0]}**\n\n` +
                        `Choose how to add coordinates for **${missingZones[0]}**:\n\n` +
                        `📍 **Use /imhere:** Go to the location in-game, use \`/imhere\`, then create route again\n\n` +
                        `✏️ **Enter Manually:** Click button below to type X, Y, Z coordinates`,
                    components: [row]
                });
            }

            // Create the first missing zone with /imhere coords
            const zoneName = missingZones[0];
            await db.query(
                'INSERT INTO teleport_zones (guild_id, server, zone_name, x, y, z, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [interaction.guild.id, serverName, zoneName, coords.x, coords.y, coords.z, interaction.user.id]
            );

            existingZones.set(zoneName, { zone_name: zoneName, x: coords.x, y: coords.y, z: coords.z });
            missingZones.shift();

            if (missingZones.length > 0) {
                return statusMsg.edit(
                    `✅ Created zone **${zoneName}** at [${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}, ${coords.z.toFixed(1)}]\n\n` +
                    `🎯 Now use \`/imhere\` at **${missingZones[0]}** and create the route again to complete it!`
                );
            }
        }

        // Both zones exist - create the route!
        await statusMsg.edit(`🔄 Creating teleport route...`);

        const fromZone = existingZones.get(fromZoneName);
        const toZone = existingZones.get(toZoneName);

        const fileName = `teleport-${fromZoneName}2${toZoneName}.json`;

        // Generate JSON
        const teleportJson = {
            PRABoxes: [{
                type: "Box",
                points: [{ x: fromZone.x, z: fromZone.y, y: fromZone.z }],
                size: { x: 27, z: 5.2, y: 11 },
                rotation: { x: 108, z: 0, y: 0 },
                display: `${fromZoneName} to ${toZoneName}`,
                allowedWeapons: 0,
                schedule: 0,
                trespassWarning: 1,
                bannedWeapons: [],
                safePositions3D: [{ x: toZone.x, z: toZone.y, y: toZone.z }]
            }]
        };

        // Upload to Nitrado
        const uploadSuccess = await this.uploadToNitrado(interaction.guild.id, serverName, fileName, teleportJson);

        if (!uploadSuccess) {
            return statusMsg.edit('❌ Failed to upload file to Nitrado server!');
        }

        // Update cfggameplay.json
        const cfgSuccess = await this.updateCfgGameplay(interaction.guild.id, serverName, fileName);

        if (!cfgSuccess) {
            return statusMsg.edit('❌ Failed to update cfggameplay.json! File uploaded but not registered.');
        }

        // Save to database
        await db.query(
            'INSERT INTO teleport_routes (guild_id, server, from_zone_name, to_zone_name, file_name, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [interaction.guild.id, serverName, fromZoneName, toZoneName, fileName, interaction.user.id]
        );

        await statusMsg.edit(
            `✅ **Route Created Successfully!**\n\n` +
            `**${fromZoneName}** → **${toZoneName}**\n` +
            `Server: **${serverName}**\n` +
            `File: \`${fileName}\`\n\n` +
            `⚠️ **Restart your server to activate the teleport!**`
        );
    },

    async startZoneUpdate(interaction) {
        const zones = await db.query(
            'SELECT zone_name, server, x, y, z FROM teleport_zones WHERE guild_id = $1 ORDER BY zone_name',
            [interaction.guild.id]
        );

        if (zones.rows.length === 0) {
            return interaction.editReply({ content: '❌ No zones found. Create a route first!', components: [] });
        }

        const menu = new MessageSelectMenu()
            .setCustomId('teleport_zone_update_select')
            .setPlaceholder('Select zone to update')
            .addOptions(zones.rows.slice(0, 25).map(zone => ({
                label: `${zone.zone_name} (${zone.server})`,
                description: `Current: [${zone.x.toFixed(1)}, ${zone.y.toFixed(1)}, ${zone.z.toFixed(1)}]`,
                value: `${zone.zone_name}|${zone.server}`
            })));

        const row = new MessageActionRow().addComponents(menu);

        await interaction.editReply({
            content: '**Update Zone Coordinates**\nUse `/imhere` at the new location, then select the zone:',
            components: [row]
        });
    },

    async startRouteDelete(interaction) {
        const routes = await db.query(
            'SELECT from_zone_name, to_zone_name, server FROM teleport_routes WHERE guild_id = $1 ORDER BY from_zone_name',
            [interaction.guild.id]
        );

        if (routes.rows.length === 0) {
            return interaction.editReply({ content: '❌ No routes found.', components: [] });
        }

        const menu = new MessageSelectMenu()
            .setCustomId('teleport_route_delete_select')
            .setPlaceholder('Select route to delete')
            .addOptions(routes.rows.slice(0, 25).map(route => ({
                label: `${route.from_zone_name} → ${route.to_zone_name}`,
                description: `Server: ${route.server}`,
                value: `${route.from_zone_name}|${route.to_zone_name}|${route.server}`
            })));

        const row = new MessageActionRow().addComponents(menu);

        await interaction.editReply({
            content: '**Delete Route**\nSelect a route to delete:',
            components: [row]
        });
    },

    async startZoneDelete(interaction) {
        const zones = await db.query(
            'SELECT zone_name, server FROM teleport_zones WHERE guild_id = $1 ORDER BY zone_name',
            [interaction.guild.id]
        );

        if (zones.rows.length === 0) {
            return interaction.editReply({ content: '❌ No zones found.', components: [] });
        }

        const menu = new MessageSelectMenu()
            .setCustomId('teleport_zone_delete_select')
            .setPlaceholder('Select zone to delete')
            .addOptions(zones.rows.slice(0, 25).map(zone => ({
                label: `${zone.zone_name} (${zone.server})`,
                value: `${zone.zone_name}|${zone.server}`
            })));

        const row = new MessageActionRow().addComponents(menu);

        await interaction.editReply({
            content: '**Delete Zone**\n⚠️ This will delete the zone and ALL routes using it!\nSelect a zone:',
            components: [row]
        });
    },

    async listZones(interaction) {
        const zones = await db.query(
            'SELECT zone_name, server, x, y, z, created_by, created_at FROM teleport_zones WHERE guild_id = $1 ORDER BY server, zone_name',
            [interaction.guild.id]
        );

        if (zones.rows.length === 0) {
            return interaction.editReply({ content: '📋 **Teleport Zones**\n\nNo zones created yet. Use "Create Route" to get started!', components: [] });
        }

        let message = '📋 **Teleport Zones**\n\n';
        let currentServer = '';

        for (const zone of zones.rows) {
            if (zone.server !== currentServer) {
                currentServer = zone.server;
                message += `\n**${zone.server}**\n`;
            }
            message += `• **${zone.zone_name}** - [${zone.x.toFixed(1)}, ${zone.y.toFixed(1)}, ${zone.z.toFixed(1)}]\n`;
        }

        message += `\n*Total: ${zones.rows.length} zones*`;

        await interaction.editReply({ content: message, components: [] });
    },

    async listRoutes(interaction) {
        const routes = await db.query(
            'SELECT from_zone_name, to_zone_name, server, file_name, created_at FROM teleport_routes WHERE guild_id = $1 ORDER BY server, from_zone_name',
            [interaction.guild.id]
        );

        if (routes.rows.length === 0) {
            return interaction.editReply({ content: '📋 **Teleport Routes**\n\nNo routes created yet. Use "Create Route" to get started!', components: [] });
        }

        let message = '📋 **Teleport Routes**\n\n';
        let currentServer = '';

        for (const route of routes.rows) {
            if (route.server !== currentServer) {
                currentServer = route.server;
                message += `\n**${route.server}**\n`;
            }
            message += `• ${route.from_zone_name} → ${route.to_zone_name}\n`;
        }

        message += `\n*Total: ${routes.rows.length} routes*`;

        await interaction.editReply({ content: message, components: [] });
    },

    // Handle modal submissions
    // Modal handlers removed - Discord.js v13 doesn't support modals
    // Route creation will be added in a future update when upgrading to v14
    /*
    async handleModalSubmit(interaction) {
        if (interaction.customId === 'teleport_route_from') {
            await this.handleRouteFromModal(interaction);
        } else if (interaction.customId === 'teleport_route_to') {
            await this.handleRouteToModal(interaction);
        } else if (interaction.customId === 'teleport_zone_update_modal') {
            await this.handleZoneUpdateModal(interaction);
        }
    },

    async handleRouteFromModal(interaction) {
        const fromZoneName = interaction.fields.getTextInputValue('from_zone_name').toLowerCase().trim();
        const serverName = interaction.fields.getTextInputValue('server_name').toLowerCase().trim();

        // Validate server name
        if (!['chernarusplus', 'enoch', 'sakhal'].includes(serverName)) {
            return interaction.reply({ content: '❌ Invalid server! Use: chernarusplus, enoch, or sakhal', ephemeral: true });
        }

        // Validate zone name (alphanumeric, underscore, dash only)
        if (!/^[a-z0-9_-]+$/.test(fromZoneName)) {
            return interaction.reply({ content: '❌ Zone name must be lowercase alphanumeric, underscore, or dash only!', ephemeral: true });
        }

        // Store in temporary storage for next step
        if (!interaction.client.tempRouteData) {
            interaction.client.tempRouteData = new Map();
        }
        interaction.client.tempRouteData.set(interaction.user.id, {
            fromZoneName,
            serverName,
            guildId: interaction.guild.id
        });

        // Show modal for "to" zone
        const modal = new ModalBuilder()
            .setCustomId('teleport_route_to')
            .setTitle('Create Teleport Route - Step 2/2');

        const toInput = new TextInputBuilder()
            .setCustomId('to_zone_name')
            .setLabel('Destination Location Name')
            .setPlaceholder('e.g., devil, nwaf, spawn')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);

        modal.addComponents(new ActionRowBuilder().addComponents(toInput));

        await interaction.showModal(modal);
    },

    async handleRouteToModal(interaction) {
        const toZoneName = interaction.fields.getTextInputValue('to_zone_name').toLowerCase().trim();

        // Validate zone name
        if (!/^[a-z0-9_-]+$/.test(toZoneName)) {
            return interaction.reply({ content: '❌ Zone name must be lowercase alphanumeric, underscore, or dash only!', ephemeral: true });
        }

        // Get stored data from first modal
        const routeData = interaction.client.tempRouteData?.get(interaction.user.id);
        if (!routeData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', ephemeral: true });
        }

        const { fromZoneName, serverName, guildId } = routeData;

        // Check if route already exists
        const existingRoute = await db.query(
            'SELECT 1 FROM teleport_routes WHERE guild_id = $1 AND server = $2 AND from_zone_name = $3 AND to_zone_name = $4',
            [guildId, serverName, fromZoneName, toZoneName]
        );

        if (existingRoute.rows.length > 0) {
            interaction.client.tempRouteData.delete(interaction.user.id);
            return interaction.reply({ content: `❌ Route **${fromZoneName}** → **${toZoneName}** already exists on **${serverName}**!`, ephemeral: true });
        }

        // Create or get zones
        await this.ensureZonesExist(interaction, guildId, serverName, fromZoneName, toZoneName);
    },

    async ensureZonesExist(interaction, guildId, serverName, fromZoneName, toZoneName) {
        const zones = await db.query(
            'SELECT zone_name, x, y, z FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND zone_name IN ($3, $4)',
            [guildId, serverName, fromZoneName, toZoneName]
        );

        const existingZones = zones.rows.map(z => z.zone_name);
        const missingZones = [];

        if (!existingZones.includes(fromZoneName)) missingZones.push(fromZoneName);
        if (!existingZones.includes(toZoneName)) missingZones.push(toZoneName);

        if (missingZones.length > 0) {
            // Need coordinates - check /imhere
            const coords = this.getLastCoordinates(interaction.user.id);
            
            let message = `⚠️ **Missing Zones**: ${missingZones.join(', ')}\n\n`;
            
            if (coords && missingZones.length === 1) {
                // Use /imhere coords for the one missing zone
                const zoneName = missingZones[0];
                await db.query(
                    'INSERT INTO teleport_zones (guild_id, server, zone_name, x, y, z, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [guildId, serverName, zoneName, coords.x, coords.y, coords.z, interaction.user.id]
                );
                message += `✅ Created **${zoneName}** at [${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}, ${coords.z.toFixed(1)}]\n\n`;
                
                // Ask for other zone
                const otherZone = fromZoneName === zoneName ? toZoneName : fromZoneName;
                message += `🎯 Now use \`/imhere\` at **${otherZone}** and run \`/admin teleport\` again to create the route.`;
                
                interaction.client.tempRouteData.delete(interaction.user.id);
                return interaction.reply({ content: message, ephemeral: true });
            } else {
                // Need more coordinates
                message += `🎯 Please use \`/imhere\` at **${missingZones[0]}** and try again.\n\n`;
                message += `💡 The system will use your /imhere coordinates to create zones automatically.`;
                
                interaction.client.tempRouteData.delete(interaction.user.id);
                return interaction.reply({ content: message, ephemeral: true });
            }
        }

        // Both zones exist - create route
        await this.createRoute(interaction, guildId, serverName, fromZoneName, toZoneName, zones.rows);
    },

    async createRoute(interaction, guildId, serverName, fromZoneName, toZoneName, zonesData) {
        const fromZone = zonesData.find(z => z.zone_name === fromZoneName);
        const toZone = zonesData.find(z => z.zone_name === toZoneName);

        const fileName = `teleport-${fromZoneName}2${toZoneName}.json`;

        // Generate JSON file content
        const teleportJson = {
            PRABoxes: [
                {
                    type: "Box",
                    points: [
                        { x: fromZone.x, z: fromZone.y, y: fromZone.z }
                    ],
                    size: { x: 27, z: 5.2, y: 11 },
                    rotation: { x: 108, z: 0, y: 0 },
                    display: `${fromZoneName} to ${toZoneName}`,
                    allowedWeapons: 0,
                    schedule: 0,
                    trespassWarning: 1,
                    bannedWeapons: [],
                    safePositions3D: [
                        { x: toZone.x, z: toZone.y, y: toZone.z }
                    ]
                }
            ]
        };

        // Upload to Nitrado
        const uploadSuccess = await this.uploadToNitrado(guildId, serverName, fileName, teleportJson);

        if (!uploadSuccess) {
            interaction.client.tempRouteData?.delete(interaction.user.id);
            return interaction.reply({ content: '❌ Failed to upload file to Nitrado server!', ephemeral: true });
        }

        // Update cfggameplay.json
        const cfgSuccess = await this.updateCfgGameplay(guildId, serverName, fileName);

        if (!cfgSuccess) {
            interaction.client.tempRouteData?.delete(interaction.user.id);
            return interaction.reply({ content: '❌ Failed to update cfggameplay.json! File uploaded but not registered.', ephemeral: true });
        }

        // Save to database
        await db.query(
            'INSERT INTO teleport_routes (guild_id, server, from_zone_name, to_zone_name, file_name, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [guildId, serverName, fromZoneName, toZoneName, fileName, interaction.user.id]
        );

        interaction.client.tempRouteData?.delete(interaction.user.id);

        await interaction.reply({
            content: `✅ **Route Created!**\n\n**${fromZoneName}** → **${toZoneName}**\nServer: **${serverName}**\nFile: \`${fileName}\`\n\n⚠️ **Restart server to apply changes!**`,
            ephemeral: true
        });
    },
    */

    async startZoneCreation(interaction) {
        const userId = interaction.user.id;
        
        // Get server from guild config (same as route creation)
        const guildConfig = await db.query(
            'SELECT map_name FROM guild_configs WHERE guild_id = $1',
            [interaction.guild.id]
        );

        if (guildConfig.rows.length === 0) {
            return interaction.editReply({
                content: '❌ No server configured! Please run `/admin setup` first.',
                components: []
            });
        }

        const serverName = guildConfig.rows[0].map_name;

        // Store server in temporary data
        if (!interaction.client.tempZoneData) {
            interaction.client.tempZoneData = new Map();
        }
        interaction.client.tempZoneData.set(userId, { 
            step: 'zone_name',
            server: serverName
        });

        // Show zone name modal directly
        const modal = new Modal()
            .setCustomId('zone_name_modal')
            .setTitle('Create Zone');

        const zoneNameInput = new TextInputComponent()
            .setCustomId('zone_name')
            .setLabel('Zone Name')
            .setStyle('SHORT')
            .setPlaceholder('e.g., devil, krona, spawn')
            .setRequired(true)
            .setMaxLength(30);

        const row = new MessageActionRow().addComponents(zoneNameInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    async handleZoneNameModal(interaction) {
        const userId = interaction.user.id;
        const zoneName = interaction.fields.getTextInputValue('zone_name').toLowerCase().trim();
        
        const tempData = interaction.client.tempZoneData?.get(userId);
        if (!tempData || !tempData.server) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', ephemeral: true });
        }

        const server = tempData.server;

        // Check if zone already exists
        const existingZone = await db.query(
            'SELECT zone_name FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND zone_name = $3',
            [interaction.guild.id, server, zoneName]
        );

        if (existingZone.rows.length > 0) {
            interaction.client.tempZoneData.delete(userId);
            return interaction.reply({ content: `❌ Zone **${zoneName}** already exists on **${server}**!`, ephemeral: true });
        }

        // Store zone name
        interaction.client.tempZoneData.set(userId, {
            ...tempData,
            step: 'coords_method',
            zoneName: zoneName
        });

        // Ask for coordinate method
        const coordsMenu = new MessageSelectMenu()
            .setCustomId('teleport_coords_method_select')
            .setPlaceholder('How do you want to set coordinates?')
            .addOptions([
                {
                    label: '📍 Use /imhere Coordinates',
                    description: 'Use your last stored coordinates from /imhere',
                    value: 'stored'
                },
                {
                    label: '✍️ Enter Manually',
                    description: 'Type in the coordinates manually',
                    value: 'manual'
                }
            ]);

        const row = new MessageActionRow().addComponents(coordsMenu);

        await interaction.reply({
            content: `**Create Zone: ${zoneName}**\n\nHow do you want to set the coordinates?`,
            components: [row],
            ephemeral: true
        });
    },

    async handleCoordsMethodSelect(interaction) {
        const userId = interaction.user.id;
        const method = interaction.values[0];
        
        const tempData = interaction.client.tempZoneData?.get(userId);
        if (!tempData || !tempData.zoneName) {
            return interaction.editReply({ content: '❌ Session expired. Please start over.', components: [] });
        }

        const { server, zoneName } = tempData;

        if (method === 'stored') {
            // Use stored coordinates
            const coords = this.getLastCoordinates(userId);
            
            if (!coords) {
                return interaction.editReply({
                    content: '❌ No stored coordinates found! Use `/imhere` in-game first, or select manual entry.',
                    components: []
                });
            }

            // Create zone with stored coordinates
            await db.query(
                'INSERT INTO teleport_zones (guild_id, server, zone_name, x, y, z, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [interaction.guild.id, server, zoneName, coords.x, coords.y, coords.z, userId]
            );

            interaction.client.tempZoneData.delete(userId);

            await interaction.editReply({
                content: `✅ **Zone Created!**\n\n**Name:** ${zoneName}\n**Server:** ${server}\n**Coordinates:** [${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}, ${coords.z.toFixed(1)}]\n\n💡 You can now use this zone to create teleport routes!`,
                components: []
            });

        } else {
            // Manual entry - show buttons
            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`manual_zone_coords|${server}|${zoneName}`)
                        .setLabel('✍️ Enter Coordinates')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('cancel_zone')
                        .setLabel('❌ Cancel')
                        .setStyle('SECONDARY')
                );

            await interaction.editReply({
                content: `**Create Zone: ${zoneName}**\n\nClick the button below to enter coordinates manually.`,
                components: [buttons]
            });
        }
    },

    async askForManualZoneCoordinates(interaction, serverName, zoneName) {
        const modal = new Modal()
            .setCustomId(`zone_coords_modal|${serverName}|${zoneName}`)
            .setTitle(`Coordinates for ${zoneName}`);

        const xInput = new TextInputComponent()
            .setCustomId('x')
            .setLabel('X Coordinate')
            .setStyle('SHORT')
            .setPlaceholder('e.g., 7000.5')
            .setRequired(true);

        const yInput = new TextInputComponent()
            .setCustomId('y')
            .setLabel('Y Coordinate')
            .setStyle('SHORT')
            .setPlaceholder('e.g., 386.2')
            .setRequired(true);

        const zInput = new TextInputComponent()
            .setCustomId('z')
            .setLabel('Z Coordinate')
            .setStyle('SHORT')
            .setPlaceholder('e.g., 11370.6')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(xInput);
        const row2 = new MessageActionRow().addComponents(yInput);
        const row3 = new MessageActionRow().addComponents(zInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    async handleZoneCoordsModal(interaction) {
        const [_, serverName, zoneName] = interaction.customId.split('|');
        
        const x = parseFloat(interaction.fields.getTextInputValue('x'));
        const y = parseFloat(interaction.fields.getTextInputValue('y'));
        const z = parseFloat(interaction.fields.getTextInputValue('z'));

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            return interaction.reply({ content: '❌ Invalid coordinates! Please enter valid numbers.', ephemeral: true });
        }

        // Create zone
        await db.query(
            'INSERT INTO teleport_zones (guild_id, server, zone_name, x, y, z, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [interaction.guild.id, serverName, zoneName, x, y, z, interaction.user.id]
        );

        interaction.client.tempZoneData?.delete(interaction.user.id);

        await interaction.reply({
            content: `✅ **Zone Created!**\n\n**Name:** ${zoneName}\n**Server:** ${serverName}\n**Coordinates:** [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]\n\n💡 You can now use this zone to create teleport routes!`,
            ephemeral: true
        });
    },

    async uploadToNitrado(guildId, serverName, fileName, jsonContent) {
        const fs = require('fs');
        const path = require('path');
        const { Client } = require('basic-ftp');
        
        try {
            const guildConfig = await db.query(
                'SELECT nitrado_token, nitrado_service_id, nitrado_instance FROM guild_configs WHERE guild_id = $1',
                [guildId]
            );

            if (guildConfig.rows.length === 0) {
                console.error('[TELEPORT] No guild config found');
                return false;
            }

            const { nitrado_token, nitrado_service_id: server_id, nitrado_instance } = guildConfig.rows[0];

            // Get FTP credentials
            const infoUrl = `https://api.nitrado.net/services/${server_id}/gameservers`;
            const infoResp = await axios.get(infoUrl, {
                headers: { 'Authorization': `Bearer ${nitrado_token}` }
            });

            const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
            const ftpHost = ftpCreds.hostname;
            const ftpUser = ftpCreds.username;
            const ftpPass = ftpCreds.password;
            const ftpPort = ftpCreds.port || 21;

            console.log(`[TELEPORT] Uploading ${fileName} via FTP to ${serverName}...`);

            // Create FTP client
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

                console.log('[TELEPORT] Connected to FTP');

                // Write to temp file and upload
                const tmpPath = path.join(__dirname, '..', 'logs', `teleport_${Date.now()}.json`);
                fs.writeFileSync(tmpPath, JSON.stringify(jsonContent, null, 4), 'utf8');

                // Get platform from guild config
                const guildConfigResult = await db.query(
                    'SELECT platform FROM guild_configs WHERE guild_id = $1',
                    [guildId]
                );
                const platformPath = getPlatformPath(guildConfigResult.rows[0]?.platform);
                const ftpFilePath = `/${platformPath}_missions/dayzOffline.${serverName}/custom/${fileName}`;
                await client.uploadFrom(tmpPath, ftpFilePath);
                fs.unlinkSync(tmpPath);

                console.log(`[TELEPORT] Successfully uploaded ${fileName} via FTP`);
                return true;
            } finally {
                client.close();
            }
        } catch (error) {
            console.error('[TELEPORT] Upload error:', error.message);
            return false;
        }
    },

    async updateCfgGameplay(guildId, serverName, fileName) {
        const fs = require('fs');
        const path = require('path');
        const { Client } = require('basic-ftp');
        
        try {
            const guildConfig = await db.query(
                'SELECT nitrado_token, nitrado_service_id, nitrado_instance, platform FROM guild_configs WHERE guild_id = $1',
                [guildId]
            );

            if (guildConfig.rows.length === 0) {
                return false;
            }

            const { nitrado_token, nitrado_service_id: server_id, nitrado_instance, platform } = guildConfig.rows[0];

            const headers = {
                'Authorization': `Bearer ${nitrado_token}`,
                'Content-Type': 'application/json'
            };

            // Download current cfggameplay.json via HTTP API (downloads work fine)
            const platformPath = getPlatformPath(platform);
            const cfgGameplayPath = `/games/${nitrado_instance}/ftproot/${platformPath}_missions/dayzOffline.${serverName}/cfggameplay.json`;
            const downloadResponse = await axios.get(
                `https://api.nitrado.net/services/${server_id}/gameservers/file_server/download?file=${encodeURIComponent(cfgGameplayPath)}`,
                { headers }
            );

            const fileUrl = downloadResponse.data.data.token.url;
            const fileResp = await axios.get(fileUrl);
            let cfgGameplay = fileResp.data;

            if (typeof cfgGameplay === 'string') {
                cfgGameplay = JSON.parse(cfgGameplay);
            }

            console.log('[TELEPORT] Current cfggameplay has playerRestrictedAreaFiles:', !!cfgGameplay.WorldsData?.playerRestrictedAreaFiles);

            // Add to playerRestrictedAreaFiles array (create if doesn't exist)
            if (!cfgGameplay.WorldsData.playerRestrictedAreaFiles) {
                console.log('[TELEPORT] Creating playerRestrictedAreaFiles array');
                cfgGameplay.WorldsData.playerRestrictedAreaFiles = [];
            }

            const customPath = `custom/${fileName}`;
            if (!cfgGameplay.WorldsData.playerRestrictedAreaFiles.includes(customPath)) {
                cfgGameplay.WorldsData.playerRestrictedAreaFiles.push(customPath);
                console.log(`[TELEPORT] Added ${customPath} to playerRestrictedAreaFiles (total: ${cfgGameplay.WorldsData.playerRestrictedAreaFiles.length})`);
            } else {
                console.log(`[TELEPORT] ${customPath} already in playerRestrictedAreaFiles`);
            }

            // Upload via FTP instead of HTTP API
            const infoUrl = `https://api.nitrado.net/services/${server_id}/gameservers`;
            const infoResp = await axios.get(infoUrl, {
                headers: { 'Authorization': `Bearer ${nitrado_token}` }
            });

            const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
            const ftpHost = ftpCreds.hostname;
            const ftpUser = ftpCreds.username;
            const ftpPass = ftpCreds.password;
            const ftpPort = ftpCreds.port || 21;

            console.log('[TELEPORT] Uploading cfggameplay.json via FTP...');

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

                console.log('[TELEPORT] Connected to FTP');

                // Write to temp file and upload
                const tmpPath = path.join(__dirname, '..', 'logs', `cfggameplay_${Date.now()}.json`);
                fs.writeFileSync(tmpPath, JSON.stringify(cfgGameplay, null, 4), 'utf8');

                const ftpCfgPath = `/${platformPath}_missions/dayzOffline.${serverName}/cfggameplay.json`;
                await client.uploadFrom(tmpPath, ftpCfgPath);
                fs.unlinkSync(tmpPath);

                console.log('[TELEPORT] Successfully updated cfggameplay.json via FTP');
                return true;
            } finally {
                client.close();
            }
        } catch (error) {
            console.error('[TELEPORT] cfggameplay update error:', error.message);
            return false;
        }
    },

    // Store coordinates from /imhere command
    storeCoordinates(userId, x, y, z) {
        lastCoordinates.set(userId, { x, y, z, timestamp: Date.now() });
    },

    // Get last coordinates for user
    getLastCoordinates(userId) {
        const coords = lastCoordinates.get(userId);
        if (!coords) return null;
        
        // Expire after 5 minutes
        if (Date.now() - coords.timestamp > 5 * 60 * 1000) {
            lastCoordinates.delete(userId);
            return null;
        }
        
        return { x: coords.x, y: coords.y, z: coords.z };
    },

    async askForManualCoordinates(interaction, fromZoneName, toZoneName, serverName, zoneName) {
        // Interaction already deferred in handleButton
        await interaction.editReply({
            content: `**Manual Coordinate Entry**\n\n` +
                `📍 Zone: **${zoneName}**\n` +
                `🗺️ Server: **${serverName}**\n\n` +
                `Please type the coordinates in this format:\n` +
                `**X Y Z**\n\n` +
                `**Example:** \`1234.5 67.8 9012.3\`\n\n` +
                `💡 Use /imhere to get your current coordinates\n` +
                `⏱️ You have 60 seconds to respond...`,
            components: []
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async (message) => {
            const coords = message.content.trim().split(/\s+/);

            if (coords.length !== 3) {
                await message.reply('❌ Invalid format! Please enter: **X Y Z** (3 numbers separated by spaces)');
                return;
            }

            const x = parseFloat(coords[0]);
            const y = parseFloat(coords[1]);
            const z = parseFloat(coords[2]);

            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                await message.reply('❌ Invalid coordinates! All values must be numbers.');
                return;
            }

            // Delete user's message
            try { await message.delete(); } catch (e) {}

            // Create the zone with manual coordinates
            await db.query(
                'INSERT INTO teleport_zones (guild_id, server, zone_name, x, y, z, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [interaction.guild.id, serverName, zoneName, x, y, z, interaction.user.id]
            );

            // Check if there are more missing zones
            const zones = await db.query(
                'SELECT zone_name FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND (zone_name = $3 OR zone_name = $4)',
                [interaction.guild.id, serverName, fromZoneName, toZoneName]
            );

            if (zones.rows.length < 2) {
                // Still missing a zone
                const existingZones = zones.rows.map(z => z.zone_name);
                const stillMissing = [fromZoneName, toZoneName].find(z => !existingZones.includes(z));

                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`manual_coords|${fromZoneName}|${toZoneName}|${serverName}|${stillMissing}`)
                            .setLabel('✏️ Enter Coordinates Manually')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId('cancel_route')
                            .setLabel('❌ Cancel')
                            .setStyle('SECONDARY')
                    );

                return interaction.channel.send({
                    content: `✅ Created zone **${zoneName}** at [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]\n\n` +
                        `🎯 Now add coordinates for **${stillMissing}**:`,
                    components: [row]
                });
            }

            // Both zones exist - continue with route creation
            await this.completeRouteCreation(interaction, interaction.channel, fromZoneName, toZoneName, serverName);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                interaction.channel.send(`⏱️ <@${interaction.user.id}> Coordinate entry timed out. Please try again.`);
            }
        });
    },

    async completeRouteCreation(interaction, channel, fromZoneName, toZoneName, serverName) {
        const statusMsg = await channel.send(`🔄 Creating teleport route...`);

        // Get both zones
        const zones = await db.query(
            'SELECT zone_name, x, y, z FROM teleport_zones WHERE guild_id = $1 AND server = $2 AND (zone_name = $3 OR zone_name = $4)',
            [interaction.guild.id, serverName, fromZoneName, toZoneName]
        );

        const fromZone = zones.rows.find(z => z.zone_name === fromZoneName);
        const toZone = zones.rows.find(z => z.zone_name === toZoneName);

        if (!fromZone || !toZone) {
            return statusMsg.edit(`❌ Error: Missing zone data. Please try again.`);
        }

        // Generate filename
        const fileName = `teleport-${fromZoneName}2${toZoneName}.json`;

        // Create teleport JSON
        const teleportJson = {
            PRABoxes: [
                {
                    type: "Box",
                    points: [
                        { x: fromZone.x, z: fromZone.y, y: fromZone.z }
                    ],
                    size: { x: 27, z: 5.2, y: 11 },
                    rotation: { x: 108, z: 0, y: 0 },
                    display: `${fromZoneName} to ${toZoneName}`,
                    allowedWeapons: 0,
                    schedule: 0,
                    trespassWarning: 1,
                    bannedWeapons: [],
                    safePositions3D: [
                        { x: toZone.x, z: toZone.y, y: toZone.z }
                    ]
                }
            ]
        };

        // Upload to Nitrado
        const uploaded = await this.uploadToNitrado(interaction.guild.id, serverName, fileName, teleportJson);

        if (!uploaded) {
            return statusMsg.edit(`❌ Failed to upload to Nitrado. Check console for error details or verify your Nitrado token and server ID in /admin setup.`);
        }

        // Save route to database
        await db.query(
            'INSERT INTO teleport_routes (guild_id, server, from_zone_name, to_zone_name, file_name, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [interaction.guild.id, serverName, fromZoneName, toZoneName, fileName, interaction.user.id]
        );

        await statusMsg.edit(
            `✅ **Route Created!**\n\n` +
            `📍 ${fromZoneName} → ${toZoneName}\n` +
            `🗺️ Server: ${serverName}\n` +
            `📄 File: ${fileName}\n\n` +
            `⚠️ **Restart server to apply changes!**`
        );
    }
};
