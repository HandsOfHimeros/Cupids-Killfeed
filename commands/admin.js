/* DayZero KillFeed (DZK) DIY Project 2.1.1
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
const { SlashCommandBuilder, hyperlink } = require('@discordjs/builders');
const fs = require('fs');
const ini = require('ini');
const { Client, Intents, MessageEmbed, Modal, MessageActionRow, TextInputComponent } = require('discord.js');
const db = require('../database');
const nodeoutlook = require('nodejs-nodemailer-outlook');
const axios = require('axios');
const path = require('path');
const Tail = require('tail').Tail;
const readline = require('readline');
const colors = require('colors');
const moment = require('moment-timezone');

// Support both config.ini (local) and environment variables (Heroku)
let config = { mapLoc: 0, showLoc: 1, kfChan: '', locChan: '', alrmChan: '' };
try {
    if (fs.existsSync('./config.ini')) {
        config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
    }
} catch (err) {
    console.log('[ADMIN] No config.ini found, using defaults');
}

let admRegex  = null, admPlat = null;

// Support both config.json (local) and environment variables (Heroku)
let GUILDID, PLATFORM, ID1, ID2, NITRATOKEN, REGION;
try {
    const configJson = require('../config.json');
    GUILDID = configJson.GUILDID;
    PLATFORM = configJson.PLATFORM;
    ID1 = configJson.ID1;
    ID2 = configJson.ID2;
    NITRATOKEN = configJson.NITRATOKEN;
    REGION = configJson.REGION;
} catch (error) {
    // Use environment variables on Heroku
    GUILDID = process.env.GUILDID;
    PLATFORM = process.env.PLATFORM || 'PLAYSTATION';
    ID1 = process.env.ID1;
    ID2 = process.env.ID2;
    NITRATOKEN = process.env.NITRATOKEN;
    REGION = process.env.REGION || 'New_York_City';
}

const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS] });

const logFile = "./logs/log.ADM";
const options = {
    separator: /[\r]{0,1}\n/,
    fromBeginning: false,
    useWatchFile: true,
    flushAtEOF: true,
    fsWatchOptions: {},
    follow: true,
    nLines: false,
    logger: console
};
const tail = new Tail(logFile, options);

let logStats = 0,
    logBytes = 0,
    logSize = 0,
    logSizeRef = 0,
    lineCount = 0,
    lineRef = 0,
    dt0 = 0,
    valueRef = new Set();

let iso, linkLoc = " ", kfChannel = " ";
let logDt = " ", dt = new Date(), todayRef = " ", today = " ";
let feedStart = false;

const phrases = [
    ") killed by ",
    "AdminLog started on ",
    "from",
    ">) bled out",
    ") with (MeleeFist)",
    ">) committed suicide",
    "[HP: 0] hit by FallDamage",
    ") was teleported from:"
];

if (PLATFORM == "XBOX" || PLATFORM == "Xbox" || PLATFORM =="xbox") {
    admPlat = '/noftp/dayzxb/config';
}else if (PLATFORM == "PLAYSTATION" || PLATFORM == "PS4" || PLATFORM == "PS5" || PLATFORM == "playstation" || PLATFORM == "Playstation") {
    admPlat = '/noftp/dayzps/config';
}else {
    admPlat = '/ftproot/dayzstandalone/config';
}

if (parseInt(config.mapLoc) === 1) {
    linkLoc = "https://www.izurvive.com/livonia/#location=";
} else if (parseInt(config.mapLoc) === 2) {
    linkLoc = "https://www.izurvive.com/sakhal/#location=";
} else if (parseInt(config.mapLoc) === 0) {
    linkLoc = "https://www.izurvive.com/#location=";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Contains all Admin Killfeed commands')
        .setDefaultMemberPermissions("0")
        .addSubcommandGroup(subcommand =>
            subcommand
                .setName('killfeed')
                .setDescription('Admin Killfeed Commands')
                .addSubcommand(subcommand =>
                    subcommand.setName('clear')
                        .setDescription('Clear channel messages (limit 100)')
                        .addIntegerOption(option => option.setName('value').setDescription('Enter new value').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('Set up Discord channels required by Killfeed')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('viewconfig')
                        .setDescription('View current server configuration')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('announce_shop')
                        .setDescription('Send shop table announcement to all servers')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('map')
                        .setDescription('Change the map setting for this server')
                        .addStringOption(option =>
                            option.setName('map')
                                .setDescription('Select map')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Chernarus+', value: 'chernarusplus' },
                                    { name: 'Livonia', value: 'enoch' },
                                    { name: 'Sakhal', value: 'sakhal' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('deathloc')
                        .setDescription('Toggle death location coordinates in killfeed')
                        .addStringOption(option =>
                            option.setName('state')
                                .setDescription('Turn death locations on or off')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'On', value: 'on' },
                                    { name: 'Off', value: 'off' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('autoban')
                        .setDescription('Toggle auto-ban on PVP kills (for PVE servers)')
                        .addStringOption(option =>
                            option.setName('state')
                                .setDescription('Turn auto-ban on or off')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'On (PVE Mode)', value: 'on' },
                                    { name: 'Off (PVP Mode)', value: 'off' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('pvpzone')
                        .setDescription('Add a PVP safe zone (kills here won\'t trigger auto-ban)')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Add or remove a PVP zone')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Add Zone', value: 'add' },
                                    { name: 'Remove Zone', value: 'remove' },
                                    { name: 'List Zones', value: 'list' }
                                )
                        )
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('Zone name (e.g., "Devil\'s Castle")')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option.setName('corner1')
                                .setDescription('First corner from iZurvive (e.g., "058 094" or just "58 94")')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option.setName('corner2')
                                .setDescription('Second corner from iZurvive (e.g., "062 098" or just "62 98")')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('safezone')
                        .setDescription('Manage safe zones on PVP servers (no-kill areas)')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Add, remove, list zones, or toggle auto-ban')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Add Zone', value: 'add' },
                                    { name: 'Remove Zone', value: 'remove' },
                                    { name: 'List Zones', value: 'list' },
                                    { name: 'Toggle Auto-Ban', value: 'toggle' }
                                )
                        )
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('Zone name (e.g., "Trader City")')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option.setName('corner1')
                                .setDescription('First corner from iZurvive (e.g., "058 094" or "11700.08 / 12652.43")')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option.setName('corner2')
                                .setDescription('Second corner from iZurvive (e.g., "062 098" or "12036.42 / 12392.07")')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('raiding')
                        .setDescription('Manage raid weekends (enable/disable base damage)')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Choose action')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Enable Raiding NOW', value: 'enable' },
                                    { name: 'Disable Raiding NOW', value: 'disable' },
                                    { name: 'Setup Automatic Schedule', value: 'schedule' },
                                    { name: 'View Status', value: 'status' }
                                )
                        )
                )
        ),

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        
        // Reload config.ini if it exists (for local dev), otherwise keep using defaults from top
        try {
            if (fs.existsSync('./config.ini')) {
                config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
            }
        } catch (err) {
            // Keep using default config set at top of file
        }

        switch (subCommand) {
            case "clear":
                await handleClearCommand(interaction);
                break;
            case 'viewconfig':
                await handleViewConfigCommand(interaction);
                break;
            case "setup":
                await handleSetupCommand(interaction);
                break;
            case "announce_shop":
                await handleAnnounceShop(interaction);
                break;
            case "map":
                await handleMapChange(interaction);
                break;
            case "deathloc":
                await handleDeathlocCommand(interaction);
                break;
            case "autoban":
                await handleAutobanCommand(interaction);
                break;
            case "pvpzone":
                await handlePvpZoneCommand(interaction);
                break;
            case "safezone":
                await handleSafeZoneCommand(interaction);
                break;
            case "raiding":
                await handleRaidingCommand(interaction);
                break;
            default:
                break;
        }
    },
    
    handleSetupModalSubmit
};

async function handleClearCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    const integer = interaction.options.getInteger('value');
    if (integer > 100) {
        return interaction.reply('The max number of messages you can delete is 100')
            .catch(console.error);
    }
    await interaction.channel.bulkDelete(integer).catch(console.error);
    await interaction.reply('clearing messages...').catch(console.error);
    await interaction.deleteReply().catch(console.error);
}

async function handleMapChange(interaction) {
    const guildId = interaction.guildId;
    
    try {
        // Check if guild has a configuration in database
        const guildConfig = await db.getGuildConfig(guildId);
        if (!guildConfig) {
            return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
        }
        
        const mapChoice = interaction.options.getString('map');
        
        // Update map in database
        await db.query(
            'UPDATE guild_configs SET map_name = $1 WHERE guild_id = $2',
            [mapChoice, guildId]
        );
        
        const mapNames = {
            'chernarusplus': 'Chernarus+',
            'enoch': 'Livonia',
            'sakhal': 'Sakhal'
        };
        
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor('#00ff99')
                    .setTitle('Map Updated')
                    .setDescription(`Killfeed map set to **${mapNames[mapChoice]}**`)
            ],
            ephemeral: true
        });
    } catch (error) {
        console.error('[MAPCHANGE] Error:', error);
        await interaction.reply({ content: 'Error updating map: ' + error.message, ephemeral: true });
    }
}

async function handleNewServerSetup(interaction) {
    console.log('[SETUP] Modal-based setup called for guild:', interaction.guildId);
    const guildId = interaction.guildId;
    
    try {
        const existingConfig = await db.getGuildConfig(guildId);
        
        if (existingConfig) {
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#ffaa00')
                        .setTitle('Server Already Configured')
                        .setDescription('This server is already set up. Use `/admin killfeed viewconfig` to see your configuration.')
                ],
                ephemeral: true
            });
            return;
        }
        
        const modal = new Modal()
            .setCustomId('guild_setup_modal')
            .setTitle('DayZ Server Setup')
            .addComponents(
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('nitrado_service_id')
                        .setLabel('Nitrado Service ID')
                        .setStyle('SHORT')
                        .setPlaceholder('e.g., 17292046')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('nitrado_instance')
                        .setLabel('Nitrado Instance ID')
                        .setStyle('SHORT')
                        .setPlaceholder('e.g., ni11886592_1')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('nitrado_token')
                        .setLabel('Nitrado API Token')
                        .setStyle('SHORT')
                        .setPlaceholder('Your Nitrado API token')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('map_name')
                        .setLabel('Map Name')
                        .setStyle('SHORT')
                        .setPlaceholder('chernarusplus, enoch, or sakhal')
                        .setValue('chernarusplus')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('restart_hours')
                        .setLabel('Restart Hours (UTC, comma separated)')
                        .setStyle('SHORT')
                        .setPlaceholder('8,11,14,17,20,23,2,5')
                        .setValue('8,11,14,17,20,23,2,5')
                        .setRequired(true)
                )
            );
        
        await interaction.showModal(modal);
        console.log('[SETUP] Modal shown successfully');
    } catch (error) {
        console.error('[SETUP] Error:', error);
        await interaction.reply({
            content: 'Error: ' + error.message,
            ephemeral: true
        }).catch(console.error);
    }
}

async function handleSetupCommand(interaction) {
    const guildId = interaction.guildId;
    console.log('[SETUP] Setup command called by guild:', guildId, 'GUILDID:', GUILDID);
    
    // If this is NOT the original server, use modal-based setup
    if (guildId !== GUILDID) {
        return await handleNewServerSetup(interaction);
    }
    
    // Original server setup (legacy)
    if (guildId && guildId === GUILDID) {
        await interaction.channel.send("....").catch(console.error);
        kfChannel =  await interaction.guild.channels.cache.find(channel => channel.name.includes("➖》💀-killfeed"));
        locChannel =  await interaction.guild.channels.cache.find(channel => channel.name.includes("➖》👀-locations"));
        alarmChannel = await interaction.guild.channels.cache.find(channel => channel.name.includes("➖》🚨-alarm"));
        
        if (kfChannel == null) {
            await interaction.guild.channels.create('➖》💀-killfeed', {
                type: 'text',
                permissionOverwrites: [{
                    id: interaction.guild.roles.everyone,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                    deny: ['ADMINISTRATOR']
                }]
            }).catch(console.error);
            kfChannel =  await interaction.guild.channels.cache.find(channel => channel.name.includes("➖》💀-killfeed"));
            await setfeed('kfChan', kfChannel.id).catch(function (error) {console.log(error);});
            await interaction.channel.send("Killfeed Channel Created Successfully!").catch(console.error);
        } else {
            await interaction.channel.send("Skipped Creating Killfeed Channel!").catch(console.error);
            await setfeed('kfChan', kfChannel.id).catch(function (error) {console.log(error);});
            console.log(`${kfChannel}`);
        }
        if (locChannel == null) {
            await interaction.guild.channels.create('➖》👀-locations', { //Create a channel
                type: 'text', //This create a text channel, you can make a voice one too, by changing "text" to "voice"
                //parent: parentCategory, //Sets a Parent Catergory for created channel
                permissionOverwrites: [{ //Set permission overwrites
                    id: interaction.guild.roles.everyone, //To make it be seen by a certain role, use a ID instead
                    deny: ['VIEW_CHANNEL'] //Deny permissions
                }]
            })
            .catch(function (error) {
                console.log(error);
            });
            locChannel =  await interaction.guild.channels.cache.find(channel => channel.name.includes("➖》👀-locations"));
            await setfeed('locChan', locChannel.id).catch(function (error) {console.log(error);});
            await interaction.channel.send("Locations Channel Created Successfully!").catch(function (error) {console.log(error);});
        }else{
            await interaction.channel.send("Skipped Creating Locations Channel!").catch(function (error) {console.log(error);});
            await setfeed('locChan', locChannel.id).catch(function (error) {console.log(error);});
            console.log(`${locChannel}`);
        }
        if (alarmChannel == null) {
            await interaction.guild.channels.create('➖》🚨-alarm', { //Create a channel
                type: 'text', //This create a text channel, you can make a voice one too, by changing "text" to "voice"
                //parent: parentCategory, //Sets a Parent Catergory for created channel
                permissionOverwrites: [{ //Set permission overwrites
                    id: interaction.guild.roles.everyone, //To make it be seen by a certain role, use a ID instead
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'], //Allow permissions
                    deny: ['ADMINISTRATOR'] //Deny permissions
                }]
            })
            .catch(function (error) {
                console.log(error);
            });
            alarmChannel = await interaction.guild.channels.cache.find(channel => channel.name.includes("➖》🚨-alarm"));
            await setfeed('alrmChan', alarmChannel.id).catch(function (error) {console.log(error);});
            await interaction.channel.send("Alarm Channel Created Successfully!").catch(function (error) {console.log(error);});
        }else{
            await interaction.channel.send("Skipped Creating Alarm Channel!").catch(function (error) {console.log(error);});
            await setfeed('alrmChan', alarmChannel.id).catch(function (error) {console.log(error);});
            console.log(`${alarmChannel}`);
        }
        setTimeout(async () => {
            await interaction.channel.bulkDelete(4).catch(console.error);
        }, 5000);
        await interaction.reply('...').catch(console.error);
        await interaction.deleteReply().catch(console.error);
    }
}

async function handleStopCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    if (feedStart) {
        await interaction.reply('Terminating Project.....').catch(console.error);
        setTimeout(() => process.exit(22), 5000);
    } else {
        await interaction.reply('THE KILLFEED IS NOT CURRENTLY RUNNING!.....').catch(console.error);
    }
}

async function handleDeathlocCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    const choice = interaction.options.getString('state');
    const showLocations = choice === "on";
    
    try {
        // Update database
        await db.query(
            'UPDATE guild_configs SET show_death_locations = $1 WHERE guild_id = $2',
            [showLocations, guildId]
        );
        
        const state = showLocations ? "Enabled" : "Disabled";
        await interaction.reply(`Death Locations **${state}!**`);
    } catch (error) {
        console.error('Error updating death location setting:', error);
        await interaction.reply({ content: 'Failed to update death location setting.', ephemeral: true });
    }
}

async function handleAutobanCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    const choice = interaction.options.getString('state');
    const autoBan = choice === "on";
    
    try {
        // Update database
        await db.query(
            'UPDATE guild_configs SET auto_ban_on_kill = $1 WHERE guild_id = $2',
            [autoBan, guildId]
        );
        
        const mode = autoBan ? "**PVE MODE** - Players will be auto-banned for killing other players" : "**PVP MODE** - Players can kill without being banned";
        await interaction.reply(`Auto-Ban ${autoBan ? "Enabled" : "Disabled"}!\n${mode}`);
    } catch (error) {
        console.error('Error updating auto-ban setting:', error);
        await interaction.reply({ content: 'Failed to update auto-ban setting.', ephemeral: true });
    }
}

async function handlePvpZoneCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    const action = interaction.options.getString('action');
    
    try {
        if (action === 'list') {
            const zones = guildConfig.pvp_zones || [];
            if (zones.length === 0) {
                return interaction.reply('No PVP zones configured. Kills anywhere will trigger auto-ban (if enabled).');
            }
            
            // Get map name for iZurvive links
            const mapName = guildConfig.map_name || 'chernarusplus';
            let mapPath = '';
            if (mapName === 'enoch') mapPath = 'livonia/';
            else if (mapName === 'sakhal') mapPath = 'sakhal/';
            
            let zoneList = '**PVP Safe Zones** (kills here won\'t trigger auto-ban):\n\n';
            zones.forEach((zone, idx) => {
                // Calculate center point for easy viewing
                const centerX = Math.round((zone.x1 + zone.x2) / 2);
                const centerZ = Math.round((zone.z1 + zone.z2) / 2);
                
                // Convert to iZurvive format (divide by 100)
                const izX1 = Math.floor(zone.x1 / 100);
                const izZ1 = Math.floor(zone.z1 / 100);
                const izX2 = Math.floor(zone.x2 / 100);
                const izZ2 = Math.floor(zone.z2 / 100);
                
                zoneList += `**${idx + 1}. ${zone.name}**\n`;
                zoneList += `   📍 [View on Map](https://www.izurvive.com/${mapPath}#location=${centerX};${centerZ})\n`;
                zoneList += `   iZurvive: (${izX1}, ${izZ1}) to (${izX2}, ${izZ2})\n`;
                zoneList += `   Corner 1: [${zone.x1}, ${zone.z1}](https://www.izurvive.com/${mapPath}#location=${zone.x1};${zone.z1})\n`;
                zoneList += `   Corner 2: [${zone.x2}, ${zone.z2}](https://www.izurvive.com/${mapPath}#location=${zone.x2};${zone.z2})\n\n`;
            });
            
            return interaction.reply(zoneList);
        }
        
        if (action === 'add') {
            const name = interaction.options.getString('name');
            const corner1 = interaction.options.getString('corner1');
            const corner2 = interaction.options.getString('corner2');
            
            if (!name || !corner1 || !corner2) {
                return interaction.reply({ 
                    content: 'To add a zone, provide:\n• **name**: Zone name\n• **corner1**: First corner (e.g., "058 094")\n• **corner2**: Second corner (e.g., "062 098")\n\nJust copy coordinates from iZurvive!', 
                    ephemeral: true 
                });
            }
            
            // Parse coordinates - supports "058 094", "11700.08 / 12652.43", "58,94", etc
            const parseCoords = (str) => {
                // Extract all numbers (including decimals)
                const nums = str.match(/[\d.]+/g);
                if (!nums || nums.length !== 2) return null;
                let x = parseFloat(nums[0]);
                let z = parseFloat(nums[1]);
                // Convert to game coords (multiply by 100 if iZurvive format)
                if (x < 1000) x *= 100;
                if (z < 1000) z *= 100;
                return { x, z };
            };
            
            const c1 = parseCoords(corner1);
            const c2 = parseCoords(corner2);
            
            if (!c1 || !c2) {
                return interaction.reply({ 
                    content: '❌ Invalid coordinates. Use format like "058 094" or "58 94"', 
                    ephemeral: true 
                });
            }
            
            const x1 = c1.x, z1 = c1.z, x2 = c2.x, z2 = c2.z;
            
            const zones = guildConfig.pvp_zones || [];
            zones.push({ name, x1, z1, x2, z2 });
            
            await db.query(
                'UPDATE guild_configs SET pvp_zones = $1 WHERE guild_id = $2',
                [JSON.stringify(zones), guildId]
            );
            
            return interaction.reply(`✅ Added PVP zone: **${name}**\niZurvive: (${Math.floor(x1/100)}, ${Math.floor(z1/100)}) to (${Math.floor(x2/100)}, ${Math.floor(z2/100)})\nGame coords: (${x1}, ${z1}) to (${x2}, ${z2})\nKills in this zone will NOT trigger auto-ban.`);
        }
        
        if (action === 'remove') {
            const name = interaction.options.getString('name');
            if (!name) {
                return interaction.reply({ content: 'Provide the zone name to remove.', ephemeral: true });
            }
            
            let zones = guildConfig.pvp_zones || [];
            const originalLength = zones.length;
            zones = zones.filter(z => z.name !== name);
            
            if (zones.length === originalLength) {
                return interaction.reply({ content: `Zone "${name}" not found.`, ephemeral: true });
            }
            
            await db.query(
                'UPDATE guild_configs SET pvp_zones = $1 WHERE guild_id = $2',
                [JSON.stringify(zones), guildId]
            );
            
            return interaction.reply(`✅ Removed PVP zone: **${name}**`);
        }
    } catch (error) {
        console.error('Error managing PVP zones:', error);
        await interaction.reply({ content: 'Failed to manage PVP zones.', ephemeral: true });
    }
}

async function handleSafeZoneCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    const action = interaction.options.getString('action');
    
    try {
        // Toggle auto-ban in safe zones
        if (action === 'toggle') {
            const newState = !guildConfig.auto_ban_in_safe_zones;
            await db.query(
                'UPDATE guild_configs SET auto_ban_in_safe_zones = $1 WHERE guild_id = $2',
                [newState, guildId]
            );
            
            const status = newState ? '**ON** - Kills in safe zones will trigger auto-ban' : '**OFF** - Safe zones are informational only';
            return interaction.reply(`✅ Safe zone auto-ban is now ${status}`);
        }
        
        // Helper function to parse coordinates (same as PVP zones)
        const parseCoords = (coordString) => {
            if (!coordString) return null;
            const numbers = coordString.match(/[\d.]+/g);
            if (!numbers || numbers.length < 2) return null;
            let [x, z] = numbers.map(parseFloat);
            // If values are less than 1000, assume they're iZurvive format and multiply by 100
            if (x < 1000) x *= 100;
            if (z < 1000) z *= 100;
            return { x, z };
        };
        
        // List safe zones
        if (action === 'list') {
            const zones = guildConfig.safe_zones || [];
            if (zones.length === 0) {
                return interaction.reply('No safe zones configured for this server.');
            }
            
            const mapName = guildConfig.map_name || 'chernarusplus';
            const autoBanStatus = guildConfig.auto_ban_in_safe_zones ? '🔴 **AUTO-BAN ENABLED**' : '⚪ Auto-ban disabled (informational only)';
            
            let response = `**Safe Zones** (${zones.length}) - ${autoBanStatus}\n\n`;
            zones.forEach((zone, index) => {
                const centerX = Math.round((zone.x1 + zone.x2) / 2);
                const centerZ = Math.round((zone.z1 + zone.z2) / 2);
                const izX = Math.floor(centerX / 100);
                const izZ = Math.floor(centerZ / 100);
                const mapUrl = `https://www.izurvive.com/${mapName}/#location=${centerX};${centerZ};5`;
                
                const width = Math.abs(zone.x2 - zone.x1);
                const height = Math.abs(zone.z2 - zone.z1);
                
                response += `**${index + 1}. ${zone.name}**\n`;
                response += `📍 [View on Map](${mapUrl})\n`;
                response += `iZurvive: (${Math.floor(zone.x1/100)}, ${Math.floor(zone.z1/100)}) to (${Math.floor(zone.x2/100)}, ${Math.floor(zone.z2/100)})\n`;
                response += `Size: ${Math.round(width)}m × ${Math.round(height)}m\n\n`;
            });
            
            return interaction.reply(response);
        }
        
        // Add safe zone
        if (action === 'add') {
            const name = interaction.options.getString('name');
            const corner1Str = interaction.options.getString('corner1');
            const corner2Str = interaction.options.getString('corner2');
            
            if (!name || !corner1Str || !corner2Str) {
                return interaction.reply({ content: 'Provide zone name and both corners.', ephemeral: true });
            }
            
            const corner1 = parseCoords(corner1Str);
            const corner2 = parseCoords(corner2Str);
            
            if (!corner1 || !corner2) {
                return interaction.reply({ content: 'Invalid coordinates. Use format: "058 094" or "11700.08 / 12652.43"', ephemeral: true });
            }
            
            const zone = {
                name,
                x1: corner1.x,
                z1: corner1.z,
                x2: corner2.x,
                z2: corner2.z
            };
            
            let zones = guildConfig.safe_zones || [];
            zones.push(zone);
            
            await db.query(
                'UPDATE guild_configs SET safe_zones = $1 WHERE guild_id = $2',
                [JSON.stringify(zones), guildId]
            );
            
            const mapName = guildConfig.map_name || 'chernarusplus';
            const centerX = Math.round((zone.x1 + zone.x2) / 2);
            const centerZ = Math.round((zone.z1 + zone.z2) / 2);
            const mapUrl = `https://www.izurvive.com/${mapName}/#location=${centerX};${centerZ};5`;
            
            return interaction.reply(`✅ Added safe zone: **${name}**\n📍 [View on Map](${mapUrl})\nCorners: (${Math.round(zone.x1)}, ${Math.round(zone.z1)}) to (${Math.round(zone.x2)}, ${Math.round(zone.z2)})`);
        }
        
        // Remove safe zone
        if (action === 'remove') {
            const name = interaction.options.getString('name');
            if (!name) {
                return interaction.reply({ content: 'Provide the zone name to remove.', ephemeral: true });
            }
            
            let zones = guildConfig.safe_zones || [];
            const originalLength = zones.length;
            zones = zones.filter(z => z.name !== name);
            
            if (zones.length === originalLength) {
                return interaction.reply({ content: `Zone "${name}" not found.`, ephemeral: true });
            }
            
            await db.query(
                'UPDATE guild_configs SET safe_zones = $1 WHERE guild_id = $2',
                [JSON.stringify(zones), guildId]
            );
            
            return interaction.reply(`✅ Removed safe zone: **${name}**`);
        }
    } catch (error) {
        console.error('Error managing safe zones:', error);
        await interaction.reply({ content: 'Failed to manage safe zones.', ephemeral: true });
    }
}

async function handleRaidingCommand(interaction) {
    const guildId = interaction.guildId;
    const action = interaction.options.getString('action');
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    switch (action) {
        case 'enable':
            await handleRaidToggle(interaction, guildConfig, true);
            break;
        case 'disable':
            await handleRaidToggle(interaction, guildConfig, false);
            break;
        case 'schedule':
            await handleRaidScheduleModal(interaction, guildConfig);
            break;
        case 'status':
            await handleRaidStatus(interaction, guildConfig);
            break;
    }
}

async function handleRaidToggle(interaction, guildConfig, enableRaiding) {
    const guildId = interaction.guildId;
    const axios = require('axios');
    const { Client: FTPClient } = require('basic-ftp');
    const path = require('path');
    
    await interaction.deferReply();
    
    try {
        console.log(`[RAIDING] ${enableRaiding ? 'Enabling' : 'Disabling'} raiding for guild ${guildId}`);
        
        const GAMEPLAY_FILE_PATH = `/games/${guildConfig.nitrado_instance}/ftproot/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
        const GAMEPLAY_FTP_PATH = `/dayzps_missions/dayzOffline.${guildConfig.map_name}/cfggameplay.json`;
        const BASE_URL = 'https://api.nitrado.net/services';
        
        // Download cfggameplay.json as TEXT (preserve formatting)
        console.log('[RAIDING] Downloading cfggameplay.json...');
        const downloadUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=${encodeURIComponent(GAMEPLAY_FILE_PATH)}`;
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const fileUrl = downloadResp.data.data.token.url;
        const fileResp = await axios.get(fileUrl, { responseType: 'text' });
        let fileContent = fileResp.data;
        
        console.log('[RAIDING] File downloaded, modifying settings...');
        
        // Toggle raid settings
        // If enabling raids: set both to false (damage is ENABLED)
        // If disabling raids: set both to true (damage is DISABLED)
        const disableValue = enableRaiding ? 'false' : 'true';
        
        // Replace disableBaseDamage
        fileContent = fileContent.replace(
            /"disableBaseDamage"\s*:\s*(true|false)/g,
            `"disableBaseDamage": ${disableValue}`
        );
        
        // Replace disableContainerDamage
        fileContent = fileContent.replace(
            /"disableContainerDamage"\s*:\s*(true|false)/g,
            `"disableContainerDamage": ${disableValue}`
        );
        
        console.log(`[RAIDING] Set disableBaseDamage and disableContainerDamage to ${disableValue}`);
        
        // Get FTP credentials
        console.log('[RAIDING] Getting FTP credentials...');
        const infoUrl = `${BASE_URL}/${guildConfig.nitrado_service_id}/gameservers`;
        const infoResp = await axios.get(infoUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const ftpCreds = infoResp.data.data.gameserver.credentials.ftp;
        const ftpHost = ftpCreds.hostname;
        const ftpUser = ftpCreds.username;
        const ftpPass = ftpCreds.password;
        const ftpPort = ftpCreds.port || 21;
        
        // Upload via FTP
        const client = new FTPClient();
        client.ftp.verbose = false;
        
        try {
            await client.access({
                host: ftpHost,
                user: ftpUser,
                password: ftpPass,
                port: ftpPort,
                secure: false
            });
            
            console.log('[RAIDING] Connected to FTP');
            
            // Write to temp file and upload
            const gameplayTmpPath = path.join(__dirname, '..', 'logs', `cfggameplay_raid_${Date.now()}.json`);
            fs.writeFileSync(gameplayTmpPath, fileContent, 'utf8');
            
            console.log('[RAIDING] Uploading modified file...');
            await client.uploadFrom(gameplayTmpPath, GAMEPLAY_FTP_PATH);
            fs.unlinkSync(gameplayTmpPath);
            
            console.log('[RAIDING] ✅ Successfully updated cfggameplay.json!');
            
            // Update database
            await db.query(
                'UPDATE guild_configs SET raid_currently_active = $1 WHERE guild_id = $2',
                [enableRaiding, guildId]
            );
            
            // Send announcement to general channel
            await sendRaidAnnouncement(interaction.guild, guildConfig, enableRaiding);
            
            const embed = new MessageEmbed()
                .setColor(enableRaiding ? '#ff5555' : '#55ff55')
                .setTitle(enableRaiding ? '⚔️ Raiding ENABLED' : '🛡️ Raiding DISABLED')
                .setDescription(
                    enableRaiding
                        ? '**Raid Weekend is now ACTIVE!**\n\n' +
                          '✅ Base damage: **ENABLED**\n' +
                          '✅ Container damage: **ENABLED**\n\n' +
                          'Players can now raid bases and damage storage containers.\n\n' +
                          '⚠️ **Server restart required** for changes to take effect!'
                        : '**Raid Weekend has ENDED!**\n\n' +
                          '❌ Base damage: **DISABLED**\n' +
                          '❌ Container damage: **DISABLED**\n\n' +
                          'Bases and containers are now protected.\n\n' +
                          '⚠️ **Server restart required** for changes to take effect!'
                )
                .setFooter({ text: 'Settings updated in cfggameplay.json' });
            
            await interaction.editReply({ embeds: [embed] });
        } finally {
            client.close();
        }
    } catch (error) {
        console.error('[RAIDING] Error:', error);
        await interaction.editReply({
            content: `❌ Failed to update raid settings: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleRaidScheduleModal(interaction, guildConfig) {
    const { Modal, TextInputComponent, MessageActionRow } = require('discord.js');
    
    const modal = new Modal()
        .setCustomId('raid_schedule_modal')
        .setTitle('Setup Automatic Raid Weekend');
    
    const startDayInput = new TextInputComponent()
        .setCustomId('start_day')
        .setLabel('Start Day (0=Sun, 1=Mon... 6=Sat)')
        .setStyle('SHORT')
        .setPlaceholder('5 (for Friday)')
        .setRequired(true)
        .setMaxLength(1);
    
    const startTimeInput = new TextInputComponent()
        .setCustomId('start_time')
        .setLabel('Start Time (24-hour format: HH:MM)')
        .setStyle('SHORT')
        .setPlaceholder('18:00')
        .setRequired(true)
        .setMaxLength(5);
    
    const endDayInput = new TextInputComponent()
        .setCustomId('end_day')
        .setLabel('End Day (0=Sun, 1=Mon... 6=Sat)')
        .setStyle('SHORT')
        .setPlaceholder('1 (for Monday)')
        .setRequired(true)
        .setMaxLength(1);
    
    const endTimeInput = new TextInputComponent()
        .setCustomId('end_time')
        .setLabel('End Time (24-hour format: HH:MM)')
        .setStyle('SHORT')
        .setPlaceholder('06:00')
        .setRequired(true)
        .setMaxLength(5);
    
    const timezoneInput = new TextInputComponent()
        .setCustomId('timezone')
        .setLabel('Timezone (e.g., America/New_York)')
        .setStyle('SHORT')
        .setPlaceholder('America/New_York')
        .setRequired(true)
        .setMaxLength(50);
    
    modal.addComponents(
        new MessageActionRow().addComponents(startDayInput),
        new MessageActionRow().addComponents(startTimeInput),
        new MessageActionRow().addComponents(endDayInput),
        new MessageActionRow().addComponents(endTimeInput),
        new MessageActionRow().addComponents(timezoneInput)
    );
    
    await interaction.showModal(modal);
}

async function handleRaidStatus(interaction, guildConfig) {
    await interaction.deferReply();
    
    const isActive = guildConfig.raid_currently_active || false;
    const scheduleEnabled = guildConfig.raid_schedule_enabled || false;
    
    const embed = new MessageEmbed()
        .setColor(isActive ? '#ff5555' : '#55ff55')
        .setTitle('⚔️ Raid Weekend Status');
    
    // Current status
    embed.addField(
        '🔴 Current Status',
        isActive ? '**RAIDING ENABLED** - Bases can be damaged!' : '**RAIDING DISABLED** - Bases are protected',
        false
    );
    
    // Countdown
    if (scheduleEnabled && guildConfig.raid_start_day !== null) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const countdown = calculateRaidCountdown(guildConfig);
        
        if (countdown) {
            embed.addField(
                isActive ? '⏰ Raid Weekend Ends In' : '⏰ Next Raid Weekend Starts In',
                countdown,
                false
            );
        }
        
        // Schedule info
        embed.addField(
            '📅 Automatic Schedule',
            `**Enabled:** Yes\n` +
            `**Start:** ${dayNames[guildConfig.raid_start_day]} at ${guildConfig.raid_start_time}\n` +
            `**End:** ${dayNames[guildConfig.raid_end_day]} at ${guildConfig.raid_end_time}\n` +
            `**Timezone:** ${guildConfig.raid_timezone}`,
            false
        );
    } else {
        embed.addField(
            '📅 Automatic Schedule',
            '**Enabled:** No\n\nUse `/admin killfeed raiding schedule` to set up automatic raid weekends!',
            false
        );
    }
    
    // Next restart info
    if (guildConfig.restart_hours) {
        const nextRestart = getNextRestartTime(guildConfig.restart_hours);
        embed.addField('🔄 Next Server Restart', nextRestart, false);
    }
    
    embed.setFooter({ text: 'Changes require server restart to take effect' });
    
    await interaction.editReply({ embeds: [embed] });
}

function calculateRaidCountdown(guildConfig) {
    try {
        const isActive = guildConfig.raid_currently_active;
        const targetDay = isActive ? guildConfig.raid_end_day : guildConfig.raid_start_day;
        const targetTime = isActive ? guildConfig.raid_end_time : guildConfig.raid_start_time;
        const timezone = guildConfig.raid_timezone || 'America/New_York';
        
        // Get current time in the guild's timezone
        const now = new Date().toLocaleString('en-US', { timeZone: timezone });
        const currentDate = new Date(now);
        const currentDay = currentDate.getDay();
        const currentHours = currentDate.getHours();
        const currentMinutes = currentDate.getMinutes();
        
        // Parse target time
        const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
        
        // Calculate days until target
        let daysUntil = targetDay - currentDay;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) {
            // Same day - check if time has passed
            const currentTotalMinutes = currentHours * 60 + currentMinutes;
            const targetTotalMinutes = targetHours * 60 + targetMinutes;
            if (currentTotalMinutes >= targetTotalMinutes) {
                daysUntil = 7; // Next week
            }
        }
        
        // Create target date
        const targetDate = new Date(currentDate);
        targetDate.setDate(targetDate.getDate() + daysUntil);
        targetDate.setHours(targetHours, targetMinutes, 0, 0);
        
        // Calculate difference
        const diff = targetDate - currentDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `**${days} days, ${hours} hours, ${minutes} minutes**`;
    } catch (error) {
        console.error('[RAID COUNTDOWN] Error:', error);
        return 'Unable to calculate';
    }
}

function getNextRestartTime(restartHours) {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const hours = restartHours.split(',').map(Number).sort((a, b) => a - b);
        
        // Find next restart hour
        let nextHour = hours.find(h => h > currentHour);
        if (!nextHour) nextHour = hours[0]; // Wrap to tomorrow
        
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

async function sendRaidAnnouncement(guild, guildConfig, enabled) {
    try {
        // Find general channel or killfeed channel
        let announcementChannel = guild.channels.cache.find(
            ch => ch.name.includes('general') || ch.name.includes('General')
        );
        
        if (!announcementChannel && guildConfig.killfeed_channel_id) {
            announcementChannel = guild.channels.cache.get(guildConfig.killfeed_channel_id);
        }
        
        if (!announcementChannel) {
            console.log('[RAID ANNOUNCEMENT] No suitable channel found');
            return;
        }
        
        const countdown = guildConfig.raid_schedule_enabled
            ? calculateRaidCountdown({ ...guildConfig, raid_currently_active: enabled })
            : null;
        
        const nextRestart = guildConfig.restart_hours
            ? getNextRestartTime(guildConfig.restart_hours)
            : 'Unknown';
        
        const embed = new MessageEmbed()
            .setColor(enabled ? '#ff5555' : '#55ff55')
            .setTitle(enabled ? '⚔️ **RAID WEEKEND IS NOW ACTIVE!** ⚔️' : '🛡️ **RAID WEEKEND HAS ENDED!** 🛡️')
            .setDescription(
                enabled
                    ? '**Raiding is ENABLED** - Bases and containers can be damaged!'
                    : '**Raiding is DISABLED** - Bases and containers are protected!'
            );
        
        if (countdown) {
            embed.addField(
                enabled ? '⏰ Raid Weekend Ends In' : '⏰ Next Raid Weekend Starts In',
                countdown,
                false
            );
        }
        
        embed.addField(
            '🔴 Status',
            enabled ? '**ACTIVE - PVP RAIDING ALLOWED**' : '**PROTECTED - NO RAIDING**',
            false
        );
        
        embed.addField(
            '⚠️ Server Restart Required',
            `Changes will take effect after the next restart.\n${nextRestart}`,
            false
        );
        
        await announcementChannel.send({
            content: '@everyone',
            embeds: [embed]
        });
        
        console.log('[RAID ANNOUNCEMENT] Sent announcement to', announcementChannel.name);
    } catch (error) {
        console.error('[RAID ANNOUNCEMENT] Error:', error);
    }
}

async function handleStartCommand(interaction) {
    const guildId = interaction.guildId;
    
    // Check if guild has a configuration in database
    const guildConfig = await db.getGuildConfig(guildId);
    if (!guildConfig) {
        return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
    }
    
    kfChannel = interaction.guild.channels.cache.find(channel => channel.name.includes("➖》💀-killfeed"));
    if (!kfChannel) return;

    if (feedStart) {
        await interaction.channel.send('THE KILLFEED IS ALREADY RUNNING!.....TRY RESETING IF YOU NEED TO RESTART').catch(console.error);
        return;
    }

    await interaction.reply("**Starting Killfeed....**").catch(console.error);
    feedStart = true;
    getDetails(interaction).catch(console.error);
}

async function getDetails(interaction) {
    tail.on("line", async (line) => {
        lineCount++;
        lineRef = lineCount;

        if (line.includes(phrases[1])) {
            logDt = line.slice(20, 30);
            console.log(`This is the logDate: ${logDt}`);
            console.log(`This is the current date: ${todayRef}`);
        }

        if (phrases.some(phrase => line.includes(phrase) && phrase != phrases[1])) {
            let vRef = line;
            if (!valueRef.has(vRef)) {
                valueRef.add(vRef);
                iso = line.split(/[|"'<>]/);
                await handleKillfeedNotification(interaction);
            }
        }
    });

    tail.on('error', console.error);

    setInterval(async () => {
        if (feedStart) {
            today = moment().tz(getTimezone()).format();
            todayRef = today.slice(0, 10);

            try {
                logResponse = axios.get('https://api.nitrado.net/services/'+`${ID1}`+'/gameservers/file_server/list?dir=/games/'+`${ID2}`+`${admPlat}`,{ responseType: 'application/json',  headers: {'Authorization' : 'Bearer '+`${NITRATOKEN}`, 'Accept': 'application/json'}})
                .then((res) => {
                    if (res.status >= 200 && res.status < 300) {
                        downloadLogFile(res.data);
                    } else {
                        console.log(res);
                    }
                });
                
            } catch (error) {
                console.error(error);
            }

            const rl = readline.createInterface({
                input: fs.createReadStream('./logs/serverlog.ADM')
            });

            rl.on('line', async (line) => {
                const URLParse = line.split(/[|"'<>()]/);
                const newURL = URLParse[11];
                try {
                    const res = await axios.get(newURL);
                    fs.writeFile('./logs/log.ADM', res.data, 'utf-8', (err) => {
                        if (err) throw err;
                        console.log('Log Saved!');
                    });
                } catch (error) {
                    console.error(error);
                }
            });

            rl.on('close', function(line) {return line;})

            rl.on('error', console.error);

            lineCount = 0;
            logStats = fs.statSync('./logs/log.ADM');
            logBytes = logStats.size;
            logSize = logBytes / 1000000.0;
            console.log(`Current Log Size: ${logSize} / LogRef Size: ${logSizeRef}\nCurrent LineRef: ${lineRef}`);
            if (logSize < logSizeRef) {
                setTimeout(() => {
                    logSizeRef = 0;
                    valueRef.clear();
                }, 40000);
            } else {
                logSizeRef = logSize;
            }
        } else {
            interaction.guild.channels.cache.get(`${config.kfChan}`).send("**K1llfeed Paused....**");
        }
    }, 35000);
}

async function handleKillfeedNotification(interaction) {
    if (!iso) return;

    var methodVal = iso[iso.length - 1].slice(2);
    var f0,f1,f2,f3,f4,f5,f6,dt0,Vloc,vLoc,Kloc,kLoc,locationVal;
    dt0 = Date.now();

    if (iso[9] && iso[5].includes(phrases[0])) { //PvP Kill
        if (methodVal.includes(phrases[2])) {
            try {
                f4 = methodVal.split(" ");
                f5 = iso[4].toString().split(/[|" "<(),>]/);
                f6 = iso[8].toString().split(/[|" "<(),>]/);
                f3 = methodVal;
                Vloc = `${f5[0]};${f5[2]};${f5[4]}`;
                Kloc = `${f6[0]};${f6[2]};${f6[4]}`;
                f0 = iso[0].toString();
                f1 = iso[6].toString();
                f2 = iso[2].toString();
                if (config.showLoc === 1) {
                    const embed = pvpEmbed(f0, f1, f2, f3, Vloc);
                    interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
                } else {
                    const embed = pvpEmbed(f0, f1, f2, f3);
                    interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
                }
                return;
            } catch (error) {
                console.error(error);
            }
        }else {
            try {
                f4 = methodVal.split(" ");
                f5 = iso[4].toString().split(/[|" "<(),>]/);
                f6 = iso[8].toString().split(/[|" "<(),>]/);
                f3 = methodVal;
                Vloc = `${f5[0]};${f5[2]};${f5[4]}`;
                Kloc = `${f6[0]};${f6[2]};${f6[4]}`;
                f0 = iso[0].toString();
                f1 = iso[6].toString();
                f2 = iso[2].toString();
                if (config.showLoc === 1) {
                    const embed = pvpEmbed(f0, f1, f2, f3, Vloc);
                    interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
                } else {
                    const embed = pvpEmbed(f0, f1, f2, f3);
                    interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
                }
                return;
            } catch (error) {
                console.error(error);
            }
        }
    }else if (!iso[6] && iso[5].includes(phrases[0])) {
        try {
            f0 = iso[0].toString();
            f1 = iso[2].toString();
            f2 = methodVal;
            locationVal = iso[iso.length - 2];
            vLoc = locationVal.split(/[|" "<(),>]/), x1 = vLoc[0], y1 = vLoc[2], z1 = vLoc[4];
            Vloc = x1.concat(`;${y1};${z1}`);
            if (config.showLoc === 1) {
                const embed = pvpEmbed(f0, f1, f2, Vloc);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            } else {
                const embed = pvpEmbed(f0, f1, f2);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            }
        }catch (error) {
            console.error(error);
        }
        return; 
    }else if (methodVal.includes("Spawning")) {
        try {
            f0 = iso[0].toString();
            f1 = iso[2].toString();
            f2 = methodVal;
            teleportEmbed(interaction, f0, f1, methodVal); 
            return;
        } catch (error) {
            console.error(error);
        }
    }else if (methodVal.includes("bled out")) {
        try {
            f0 = iso[0].toString();
            f1 = iso[2].toString();
            f2 = methodVal;
            locationVal = iso[iso.length - 2];
            vLoc = locationVal.split(/[|" "<(),>]/), x1 = vLoc[0], y1 = vLoc[2], z1 = vLoc[4];
            Vloc = x1.concat(`;${y1};${z1}`);
            if (config.showLoc === 1) {
                const embed = pveEmbed(f0, f1, f2, Vloc);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            } else {
                const embed = pveEmbed(f0, f1, f2);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            }
        }catch (error) {
            console.error(error);
        }
    }else if (methodVal.includes("hit by FallDamage")) { //Fall to Death
        try {
            f0 = iso[0].toString();
            f1 = iso[2].toString();
            f2 = "fell to their death";
            locationVal = iso[iso.length - 3];
            vLoc = locationVal.split(/[|" "<(),>]/), x1 = vLoc[0], y1 = vLoc[2], z1 = vLoc[4];
            Vloc = x1.concat(`;${y1};${z1}`);

            if (config.showLoc === 1) {
                const embed = pveEmbed(f0, f1, f2, Vloc);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            } else {
                const embed = pveEmbed(f0, f1, f2);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            }
        }catch (error) {
            console.error(error);
        }

    }else if (methodVal.includes("committed suicide")) { //Commited Suicide
        try {
            f0 = iso[0].toString();
            f1 = iso[2].toString();
            f2 = methodVal;
            locationVal = iso[iso.length - 2];
            vLoc = locationVal.split(/[|" "<(),>]/), x1 = vLoc[0], y1 = vLoc[2], z1 = vLoc[4];
            Vloc = x1.concat(`;${y1};${z1}`);

            if (config.showLoc === 1) {
                const embed = pveEmbed(f0, f1, f2, Vloc);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            } else {
                const embed = pveEmbed(f0, f1, f2);
                interaction.guild.channels.cache.get(config.kfChan).send({ embeds: [embed], files: ['./images/crown.png'] }).catch(console.error);
            }
        }catch (error) {
            console.error(error);
        }
    } 
}

function pveEmbed(f0, f1, f2, Vloc) {
    const url = "https://thecodegang.com";
    const link = hyperlink("Sign-up for DayZero", url);
    const embed = new MessageEmbed()
        .setColor('0xDD0000')
        .setTitle(`Killfeed Notification`)
        .setThumbnail('attachment://crown.png')
        .setDescription(`${f0} **${f1}** ${f2}`)
        .addFields(
            {name: `Get Your Free Killfeed!`, value: `${link}`, inline: false},
        )

    if (Vloc) {
        embed.addFields(
            {name: `🌐`, value: `${linkLoc}${Vloc}`, inline: false},
        )

    }

    return embed;
}

function pvpEmbed(f0, f1, f2, f3, Vloc) {
    const url = "https://thecodegang.com";
    const link = hyperlink("Sign-up for DayZero", url);
    const embed = new MessageEmbed()
        .setColor('0xDD0000')
        .setTitle(`Killfeed Notification`)
        .setThumbnail('attachment://crown.png')
        .setDescription(`${f0} **${f1}** Killed **${f2}** ${f3}`)
        .addFields(
            {name: `Get Your Free Killfeed!`, value: `${link}`, inline: false},
        )

    if (Vloc) {
        embed.addFields(
            {name: `🌐`, value: `${linkLoc}${Vloc}`, inline: false},
        )
    }

    return embed;
}

function teleportEmbed(interaction, f0, f1, methodVal) {//Restricted Area Teleport Event
    const url = "https://thecodegang.com"
    const link = hyperlink("Sign-up for DayZero", url)
    const attachment = ('./images/crown.png');
    const embed = new MessageEmbed()
    .setColor('0xDD0000')
    .setTitle(`Teleport Notification`)
    .setThumbnail('attachment://crown.png')
    .setDescription(`${f0} **${f1}** ${methodVal}`)
    .addField('Get Your Free Killfeed!', `${link}`)
    interaction.guild.channels.cache.get(config.teleFeed).send({embeds: [embed], files: [`${attachment}`]})
    .catch(function (error) {
        console.log(error);
    });		
}

function getLocation(isoValue) {
    if (!isoValue) return null;
    const locArray = isoValue.split(/[|" "<(),>]/);
    return locArray.join(';');
}

function getTimezone() {
    switch (REGION.toUpperCase()) {
        case "FRANKFURT":
            return 'Europe/Berlin';
        case "LOS ANGELES":
            return 'America/Los_Angeles';
        case "LONDON":
            return 'Europe/London';
        case "MIAMI":
            return 'America/New_York';
        case "NEW YORK":
            return 'America/New_York';
        case "SINGAPORE":
            return 'Asia/Singapore';
        case "SYDNEY":
            return 'Australia/Sydney';
        case "MOSCOW":
            return 'Europe/Moscow';
        default:
            return 'UTC';
    }
}

async function downloadLogFile(res) {
    let url1, url2, url3;
    if (PLATFORM.match(/XBOX|xbox|Xbox/i)) {
        admRegex = /^DayZServer_X1_x64_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.ADM$/;
        const latestADM = await getLatestADMEntry(res);
        if (latestADM) {
           url1 = 'https://api.nitrado.net/services/'
           url2 = '/gameservers/file_server/download?file=/games/'
           url3 = `/noftp/dayzxb/config/${latestADM.name}`
        } else {
        return console.log("Unable to determine logfile name!");
        }
    } else if (PLATFORM.match(/PLAYSTATION|PS4|PS5|playstation|Playstation/i)) {
        admRegex = /^DayZServer_X1_x64_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.ADM$/;
        const latestADM = await getLatestADMEntry(res);
        if (latestADM) {
           url1 = 'https://api.nitrado.net/services/'
           url2 = '/gameservers/file_server/download?file=/games/'
           url3 = `/noftp/dayzps/config/${latestADM.name}`
        } else {
        return console.log("Unable to determine logfile name!");
        }
    } else {
        admRegex = /^DayZServer_X1_x64_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.ADM$/;
        const latestADM = await getLatestADMEntry(res);
        if (latestADM) {
           url1 = 'https://api.nitrado.net/services/'
           url2 = '/gameservers/file_server/download?file=/games/'
           url3 = `/ftproot/dayzstandalone/config/${latestADM.name}`
        } else {
        return console.log("Unable to determine logfile name!");
        }
    }
    const filePath = path.resolve('./logs', 'serverlog.ADM');
    const writer = fs.createWriteStream(filePath);
    const response = await axios.get(`${url1}${ID1}${url2}${ID2}${url3}`, { responseType: 'stream', headers: { 'Authorization': `Bearer ${NITRATOKEN}`, 'Accept': 'application/octet-stream' } });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function getLatestADMEntry(jsonObj) {
    if (
        !jsonObj ||
        typeof jsonObj !== "object" ||
        !jsonObj.data ||
        !Array.isArray(jsonObj.data.entries)
    ) {
        throw new Error("Invalid JSON structure!");
    }

    let latestEntry = null;
    let latestKey = null; 

    for (const entry of jsonObj.data.entries) {
        // I only care about files whose name matches the ADM‐pattern
        if (entry.type !== "file" || typeof entry.name !== "string") {
        continue;
        }

        const match = entry.name.match(admRegex);
        if (!match) {
        continue;
        }

        const rawStamp = match[1];

        const normalized = rawStamp.replace(/[-_]/g, "");

        if (latestKey === null || normalized > latestKey) {
        latestKey = normalized;
        latestEntry = entry;
        }
    }
    
    return latestEntry;
}

async function setfeed(name, ChanId) {
    if (name == "kfChan") {
        config.kfChan = `${ChanId}`
    }if (name == "locChan") {
        config.locChan = `${ChanId}`
    }if (name == "alrmChan") {
        config.alrmChan = `${ChanId}`
    }
    fs.writeFileSync('./config.ini', ini.stringify(config, { name: `${ChanId}`}))
    console.log(`${name} Channel Set!`);
}

console.log(
    `\n.&&@@@%#%/   `.white, `      .,**,******,,,*,`.red, `   .*#####(  (###(,`.yellow,
    `\n,@@@@@@@@@@@@@.   `.white, ` ,*********. .**.`.red, `   .###### .####`.yellow,
    `\n,@@@@@@@@@@@@@@@   `.white, ` ******      *`.red, `         /##,######,`.yellow,
    `\n,@@@@@%   &@@@@@&   `.white, `      .******.`.red, `    .############.`.yellow,
    `\n   @@@@@@@@@@@@@@/   `.white, `    .******`.red, `      .###########.`.yellow,
    `\n %@@@@@*   &@@@@@%   `.white, `   *******`.red, `       .############,`.yellow,
    `\n #@@@@@* ,@@@@@@@   `.white,  `  *******`.red, `         .######.######,`.yellow,
    `\n #@@@@@@@&%.%@@#   `.white,   ` ******.   ,,.,`.red, `      *#####  ######*` .yellow,
    `\n #@@@@.*    (   `.white,      `  .*****. ,*,**,,*`.red, `          ##   ######/`.yellow
);

console.log(`\nThis is dt: ${dt}`);

async function handleViewConfigCommand(interaction) {
    const guildId = interaction.guildId;
    
    try {
        const config = await db.getGuildConfig(guildId);
        
        if (!config) {
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#ff5555')
                        .setTitle('Not Configured')
                        .setDescription('This server has not been set up yet. Use `/admin killfeed setup` to configure.')
                ],
                ephemeral: true
            });
            return;
        }
        
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor('#00ff99')
                    .setTitle('Server Configuration')
                    .addFields(
                        { name: 'Nitrado Service ID', value: config.nitrado_service_id, inline: true },
                        { name: 'Nitrado Instance', value: config.nitrado_instance, inline: true },
                        { name: 'Map', value: config.map_name, inline: true },
                        { name: 'Platform', value: config.platform, inline: true },
                        { name: 'Economy Channel', value: config.economy_channel_id ? `<#${config.economy_channel_id}>` : 'Not set', inline: true },
                        { name: 'Shop Channel', value: config.shop_channel_id ? `<#${config.shop_channel_id}>` : 'Not set', inline: true },
                        { name: 'Killfeed Channel', value: config.killfeed_channel_id ? `<#${config.killfeed_channel_id}>` : 'Not set', inline: true },
                        { name: 'Connections Channel', value: config.connections_channel_id ? `<#${config.connections_channel_id}>` : 'Not set', inline: true },
                        { name: 'Restart Hours (UTC)', value: config.restart_hours, inline: false }
                    )
                    .setFooter({ text: `Configured: ${new Date(config.created_at).toLocaleString()}` })
            ],
            ephemeral: true
        });
    } catch (error) {
        console.error('[VIEWCONFIG] Error:', error);
        await interaction.reply({
            content: 'Error retrieving configuration: ' + error.message,
            ephemeral: true
        });
    }
}

async function handleSetupModalSubmit(interaction) {
    console.log('[SETUP_MODAL] Modal submitted by guild:', interaction.guildId);
    const guildId = interaction.guildId;
    
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const serviceId = interaction.fields.getTextInputValue('nitrado_service_id');
        const instance = interaction.fields.getTextInputValue('nitrado_instance');
        const token = interaction.fields.getTextInputValue('nitrado_token');
        const mapName = interaction.fields.getTextInputValue('map_name').toLowerCase();
        const restartHours = interaction.fields.getTextInputValue('restart_hours');
        
        const validMaps = ['chernarusplus', 'enoch', 'sakhal'];
        if (!validMaps.includes(mapName)) {
            await interaction.editReply({
                content: `Invalid map name. Must be one of: ${validMaps.join(', ')}`
            });
            return;
        }
        
        await db.setGuildConfig(guildId, {
            nitratoServiceId: serviceId,
            nitratoInstance: instance,
            nitratoToken: token,
            mapName: mapName,
            platform: 'PS4',
            restartHours: restartHours,
            timezone: 'UTC'
        });
        
        await interaction.editReply({ content: 'Creating Discord channels...' });
        
        const channels = {};
        
        const economyChannel = await interaction.guild.channels.create('💰-economy', {
            type: 'GUILD_TEXT',
            permissionOverwrites: [{
                id: interaction.guild.roles.everyone,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
            }]
        });
        channels.economyChannel = economyChannel.id;
        
        const shopChannel = await interaction.guild.channels.create('🛒-shop', {
            type: 'GUILD_TEXT',
            permissionOverwrites: [{
                id: interaction.guild.roles.everyone,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
            }]
        });
        channels.shopChannel = shopChannel.id;
        
        const killfeedChannel = await interaction.guild.channels.create('💀-killfeed', {
            type: 'GUILD_TEXT',
            permissionOverwrites: [{
                id: interaction.guild.roles.everyone,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
            }]
        });
        channels.killfeedChannel = killfeedChannel.id;
        
        const connectionsChannel = await interaction.guild.channels.create('🔌-connections', {
            type: 'GUILD_TEXT',
            permissionOverwrites: [{
                id: interaction.guild.roles.everyone,
                allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
            }]
        });
        channels.connectionsChannel = connectionsChannel.id;
        
        const buildChannel = await interaction.guild.channels.create('🔨-build-log', {
            type: 'GUILD_TEXT',
            permissionOverwrites: [{
                id: interaction.guild.roles.everyone,
                allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
            }]
        });
        channels.buildChannel = buildChannel.id;
        
        const suicideChannel = await interaction.guild.channels.create('💀-suicide-log', {
            type: 'GUILD_TEXT',
            permissionOverwrites: [{
                id: interaction.guild.roles.everyone,
                allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
            }]
        });
        channels.suicideChannel = suicideChannel.id;
        
        await db.setGuildChannels(guildId, channels);
        
        await interaction.editReply({
            embeds: [
                new MessageEmbed()
                    .setColor('#00ff99')
                    .setTitle('✅ Setup Complete!')
                    .setDescription('Your DayZ server has been configured successfully!')
                    .addFields(
                        { name: 'Economy Channel', value: `<#${economyChannel.id}>`, inline: true },
                        { name: 'Shop Channel', value: `<#${shopChannel.id}>`, inline: true },
                        { name: 'Killfeed Channel', value: `<#${killfeedChannel.id}>`, inline: true },
                        { name: 'Connections Channel', value: `<#${connectionsChannel.id}>`, inline: true },
                        { name: 'Build Log Channel', value: `<#${channels.buildChannel}>`, inline: true },
                        { name: 'Suicide Log Channel', value: `<#${channels.suicideChannel}>`, inline: true },
                        { name: 'Map', value: mapName, inline: true },
                        { name: 'Platform', value: 'PS4', inline: true }
                    )
                    .setFooter({ text: 'Bot is now ready to use!' })
            ]
        });
        
        console.log(`[SETUP_MODAL] Guild ${guildId} configured successfully`);
    } catch (error) {
        console.error('[SETUP_MODAL] Error:', error);
        await interaction.editReply({
            content: 'Error during setup: ' + error.message
        }).catch(console.error);
    }
}

async function handleAnnounceShop(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Get all configured guilds
        const guilds = await db.getAllGuildConfigs();
        console.log(`[ANNOUNCE_SHOP] Found ${guilds.length} configured guilds`);
        
        let successCount = 0;
        let failCount = 0;
        const results = [];
        
        for (const guildConfig of guilds) {
            try {
                const guild = await interaction.client.guilds.fetch(guildConfig.guild_id);
                
                // Look for general channel
                const generalChannel = guild.channels.cache.find(ch => 
                    ch.name.toLowerCase().includes('general') || 
                    ch.name.toLowerCase().includes('announcement') ||
                    ch.name === 'wop-general'
                );
                
                if (!generalChannel) {
                    console.log(`⚠️  No general channel found for guild ${guild.name}`);
                    results.push(`❌ ${guild.name} - No general channel found`);
                    failCount++;
                    continue;
                }
                
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
                results.push(`✅ ${guild.name} - #${generalChannel.name}`);
                successCount++;
                
                // Small delay between servers
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error sending to guild ${guildConfig.guild_id}:`, error.message);
                results.push(`❌ ${guildConfig.guild_id} - ${error.message}`);
                failCount++;
            }
        }
        
        // Send summary to admin
        const summaryEmbed = new MessageEmbed()
            .setColor(failCount === 0 ? '#00ff00' : '#ffaa00')
            .setTitle('📢 Shop Announcement Results')
            .setDescription(
                `**Sent:** ${successCount} servers\n` +
                `**Failed:** ${failCount} servers\n\n` +
                results.join('\n')
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [summaryEmbed] });
        console.log('\n🎉 Shop announcement process complete!');
        
    } catch (error) {
        console.error('❌ Fatal error in announce_shop:', error);
        await interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true });
    }
}
