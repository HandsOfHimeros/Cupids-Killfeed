const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const db = require('../database');
const fs = require('fs');
const path = require('path');

// Price constants
const PURCHASE_PRICE = 20000;
const RELOCATE_PRICE = 10000;
const ALERT_RADIUS = 50;

// Helper to get user's DayZ character name from economy system
function getDayZName(userId) {
    try {
        const DAYZ_NAMES_FILE = path.join(__dirname, '../dayz_names.json');
        if (!fs.existsSync(DAYZ_NAMES_FILE)) {
            return null;
        }
        const names = JSON.parse(fs.readFileSync(DAYZ_NAMES_FILE, 'utf8'));
        return names[userId] || null;
    } catch (err) {
        console.error('[BASEALERT] Error reading DayZ names:', err);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('basealert')
        .setDescription('Base proximity alert system - get notified when players are near your base')
        .addSubcommand(subcommand =>
            subcommand
                .setName('purchase')
                .setDescription(`Purchase the base alert feature (${PURCHASE_PRICE.toLocaleString()} coins)`)
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setbase')
                .setDescription('Set or relocate your base location')
                .addStringOption(option =>
                    option
                        .setName('server')
                        .setDescription('Which server is this base on?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Chernarus', value: 'chernarusplus' },
                            { name: 'Livonia', value: 'enoch' },
                            { name: 'Sakhal', value: 'sakhal' }
                        )
                )
                .addNumberOption(option =>
                    option
                        .setName('x')
                        .setDescription('X coordinate from iZurvive (e.g. 6900.87)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(15360)
                )
                .addNumberOption(option =>
                    option
                        .setName('y')
                        .setDescription('Y coordinate from iZurvive (e.g. 11430.08)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(15360)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage your trusted faction members')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('What to do?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add Player', value: 'add' },
                            { name: 'Remove Player', value: 'remove' },
                            { name: 'List All', value: 'list' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('server')
                        .setDescription('Which server?')
                        .addChoices(
                            { name: 'Chernarus', value: 'chernarusplus' },
                            { name: 'Livonia', value: 'enoch' },
                            { name: 'Sakhal', value: 'sakhal' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('playername')
                        .setDescription('Exact DayZ in-game name (case-sensitive!)')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable alerts')
                .addStringOption(option =>
                    option
                        .setName('server')
                        .setDescription('Which server?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Chernarus', value: 'chernarusplus' },
                            { name: 'Livonia', value: 'enoch' },
                            { name: 'Sakhal', value: 'sakhal' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your base alert settings for all servers')
        ),

    async execute(interaction) {
        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            if (subcommand === 'purchase') {
                await handlePurchase(interaction, guildId, userId);
            } else if (subcommand === 'setbase') {
                await handleSetBase(interaction, guildId, userId);
            } else if (subcommand === 'whitelist') {
                await handleWhitelist(interaction, guildId, userId);
            } else if (subcommand === 'toggle') {
                await handleToggle(interaction, guildId, userId);
            } else if (subcommand === 'status') {
                await handleStatus(interaction, guildId, userId);
            }
        } catch (error) {
            console.error('Base alert command error:', error);
            await interaction.editReply('❌ An error occurred!');
        }
    }
};

async function handlePurchase(interaction, guildId, userId) {
    // Check if they already own it
    const existing = await db.query(
        'SELECT COUNT(*) as count FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2',
        [guildId, userId]
    );

    if (existing.rows[0].count > 0) {
        return interaction.editReply('❌ You already own the base alert feature!');
    }

    // Check balance using same method as economy/shop commands
    const currentBalance = await db.getBalance(guildId, userId);

    if (currentBalance < PURCHASE_PRICE) {
        return interaction.editReply(
            `❌ Insufficient funds! You need ${PURCHASE_PRICE.toLocaleString()} coins.\n` +
            `Your balance: ${currentBalance.toLocaleString()} coins`
        );
    }

    // Deduct payment using same method as economy/shop commands
    await db.addBalance(guildId, userId, -PURCHASE_PRICE);

    // Auto-whitelist user's DayZ character if they have set their name
    const userDayZName = getDayZName(userId);
    let autoWhitelistNote = '';
    
    if (userDayZName) {
        autoWhitelistNote = `\n\n✅ **Auto-whitelisted:** Your character "${userDayZName}" has been automatically whitelisted to prevent self-alerts.`;
        console.log(`[BASEALERT] Auto-whitelisted ${userDayZName} for user ${userId} in guild ${guildId}`);
    }

    const embed = new MessageEmbed()
        .setColor('#00FF00')
        .setTitle('🎉 Base Alert Feature Purchased!')
        .setDescription(
            `You can now set up proximity alerts for your bases!\n\n` +
            `**Features:**\n` +
            `• Get DM alerts when players come within ${ALERT_RADIUS}m of your base\n` +
            `• Set one base per server (Chernarus, Livonia, Sakhal)\n` +
            `• Whitelist faction members to avoid false alerts\n` +
            `• Relocate bases for ${RELOCATE_PRICE.toLocaleString()} coins each\n\n` +
            `**Next Steps:**\n` +
            `1. Use \`/basealert setbase\` to set your first base location (free!)\n` +
            `2. Use \`/basealert whitelist add\` to add trusted players\n` +
            `3. Use \`/basealert status\` to view your settings${autoWhitelistNote}`
        )
        .setFooter({ text: `Spent ${PURCHASE_PRICE.toLocaleString()} coins` });

    await interaction.editReply({ embeds: [embed] });
}

async function handleSetBase(interaction, guildId, userId) {
    const server = interaction.options.getString('server');
    const x = interaction.options.getNumber('x');
    const y = interaction.options.getNumber('y');

    // Check if they own the feature (have at least one base alert)
    const ownedCheck = await db.query(
        'SELECT COUNT(*) as count FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2',
        [guildId, userId]
    );

    const isFirstBase = ownedCheck.rows[0].count === 0;

    if (isFirstBase) {
        return interaction.editReply(
            '❌ You need to purchase the base alert feature first!\n' +
            `Use \`/basealert purchase\` (${PURCHASE_PRICE.toLocaleString()} coins)`
        );
    }

    // Check if they already have a base on this server
    const existingBase = await db.query(
        'SELECT id FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2 AND server_name = $3',
        [guildId, userId, server]
    );

    const isRelocating = existingBase.rows.length > 0;

    // If relocating, charge fee
    if (isRelocating) {
        const currentBalance = await db.getBalance(guildId, userId);

        if (currentBalance < RELOCATE_PRICE) {
            return interaction.editReply(
                `❌ Insufficient funds! Relocating a base costs ${RELOCATE_PRICE.toLocaleString()} coins.\n` +
                `Your balance: ${currentBalance.toLocaleString()} coins`
            );
        }

        // Deduct relocation fee using same method as economy/shop commands
        await db.addBalance(guildId, userId, -RELOCATE_PRICE);
    }

    // Get map display name
    const mapNames = {
        'chernarusplus': 'Chernarus',
        'enoch': 'Livonia',
        'sakhal': 'Sakhal'
    };
    const mapName = mapNames[server];

    // Get iZurvive URL
    const mapPaths = {
        'chernarusplus': '',
        'enoch': 'livonia/',
        'sakhal': 'sakhal/'
    };
    const izurviveUrl = `https://www.izurvive.com/${mapPaths[server]}#location=${x};${y}`;

    // Upsert base location
    let baseAlertId;
    if (isRelocating) {
        await db.query(
            'UPDATE base_alerts SET base_x = $1, base_y = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [x, y, existingBase.rows[0].id]
        );
        baseAlertId = existingBase.rows[0].id;
    } else {
        const insertResult = await db.query(
            'INSERT INTO base_alerts (guild_id, server_name, discord_user_id, base_x, base_y, alert_radius, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id',
            [guildId, server, userId, x, y, ALERT_RADIUS]
        );
        baseAlertId = insertResult.rows[0].id;
        
        // Auto-whitelist user's DayZ character on first base setup
        const userDayZName = getDayZName(userId);
        if (userDayZName) {
            try {
                await db.query(
                    'INSERT INTO base_alert_whitelist (base_alert_id, whitelisted_player_name) VALUES ($1, $2)',
                    [baseAlertId, userDayZName]
                );
                console.log(`[BASEALERT] Auto-whitelisted ${userDayZName} for base ${baseAlertId}`);
            } catch (err) {
                console.error('[BASEALERT] Error auto-whitelisting:', err);
            }
        }
    }

    let whitelistNote = '';
    const userDayZName = getDayZName(userId);
    if (!isRelocating && userDayZName) {
        whitelistNote = `\n\n✅ **Auto-whitelisted:** Your character "${userDayZName}" to prevent self-alerts.`;
    }

    const embed = new MessageEmbed()
        .setColor('#00FF00')
        .setTitle(isRelocating ? '📍 Base Relocated!' : '📍 Base Location Set!')
        .setDescription(
            `**Server:** ${mapName}\n` +
            `**Coordinates:** (${x}, ${y})\n` +
            `**Alert Radius:** ${ALERT_RADIUS}m\n\n` +
            `You will receive DM alerts when players come within ${ALERT_RADIUS}m of this location.\n\n` +
            `[View on iZurvive](${izurviveUrl})${whitelistNote}`
        );

    if (isRelocating) {
        embed.setFooter({ text: `Relocation fee: ${RELOCATE_PRICE.toLocaleString()} coins` });
    } else {
        embed.setFooter({ text: 'First base on this server - Free!' });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleWhitelist(interaction, guildId, userId) {
    const action = interaction.options.getString('action');
    const server = interaction.options.getString('server');
    const playerName = interaction.options.getString('playername');

    if (action === 'list') {
        return await handleWhitelistList(interaction, guildId, userId);
    }

    if (!server || !playerName) {
        return interaction.editReply('❌ You must specify both server and player name for add/remove actions!');
    }

    // Get the base alert for this server
    const baseResult = await db.query(
        'SELECT id FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2 AND server_name = $3',
        [guildId, userId, server]
    );

    if (baseResult.rows.length === 0) {
        const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
        return interaction.editReply(
            `❌ You don't have a base set on ${mapNames[server]}!\n` +
            `Use \`/basealert setbase\` first.`
        );
    }

    const baseAlertId = baseResult.rows[0].id;

    if (action === 'add') {
        // Check if already whitelisted
        const existingCheck = await db.query(
            'SELECT id FROM base_alert_whitelist WHERE base_alert_id = $1 AND whitelisted_player_name = $2',
            [baseAlertId, playerName]
        );

        if (existingCheck.rows.length > 0) {
            return interaction.editReply(`❌ **${playerName}** is already whitelisted!`);
        }

        await db.query(
            'INSERT INTO base_alert_whitelist (base_alert_id, whitelisted_player_name) VALUES ($1, $2)',
            [baseAlertId, playerName]
        );

        const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
        await interaction.editReply(
            `✅ Added **${playerName}** to whitelist on ${mapNames[server]}!\n\n` +
            `⚠️ **Important:** This must be the exact in-game name as it appears in killfeed logs (case-sensitive).`
        );

    } else if (action === 'remove') {
        const deleteResult = await db.query(
            'DELETE FROM base_alert_whitelist WHERE base_alert_id = $1 AND whitelisted_player_name = $2',
            [baseAlertId, playerName]
        );

        if (deleteResult.rowCount === 0) {
            return interaction.editReply(`❌ **${playerName}** is not on your whitelist!`);
        }

        const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
        await interaction.editReply(`✅ Removed **${playerName}** from whitelist on ${mapNames[server]}.`);
    }
}

async function handleWhitelistList(interaction, guildId, userId) {
    const basesResult = await db.query(
        'SELECT id, server_name FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2 ORDER BY server_name',
        [guildId, userId]
    );

    if (basesResult.rows.length === 0) {
        return interaction.editReply('❌ You don\'t have any bases set up yet!');
    }

    const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
    const embed = new MessageEmbed()
        .setColor('#0099FF')
        .setTitle('📋 Whitelisted Players');

    for (const base of basesResult.rows) {
        const whitelistResult = await db.query(
            'SELECT whitelisted_player_name FROM base_alert_whitelist WHERE base_alert_id = $1 ORDER BY whitelisted_player_name',
            [base.id]
        );

        const players = whitelistResult.rows.map(r => r.whitelisted_player_name);
        const playerList = players.length > 0 ? players.join('\n') : 'None';

        embed.addFields({
            name: `${mapNames[base.server_name]} (${players.length})`,
            value: playerList,
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleToggle(interaction, guildId, userId) {
    const server = interaction.options.getString('server');

    const baseResult = await db.query(
        'SELECT id, is_active FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2 AND server_name = $3',
        [guildId, userId, server]
    );

    if (baseResult.rows.length === 0) {
        const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
        return interaction.editReply(
            `❌ You don't have a base set on ${mapNames[server]}!\n` +
            `Use \`/basealert setbase\` first.`
        );
    }

    const currentStatus = baseResult.rows[0].is_active;
    const newStatus = !currentStatus;

    await db.query(
        'UPDATE base_alerts SET is_active = $1 WHERE id = $2',
        [newStatus, baseResult.rows[0].id]
    );

    const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
    await interaction.editReply(
        newStatus 
            ? `✅ Alerts **enabled** for ${mapNames[server]}!`
            : `🔇 Alerts **disabled** for ${mapNames[server]}.`
    );
}

async function handleStatus(interaction, guildId, userId) {
    const basesResult = await db.query(
        'SELECT server_name, base_x, base_y, alert_radius, is_active FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2 ORDER BY server_name',
        [guildId, userId]
    );

    if (basesResult.rows.length === 0) {
        return interaction.editReply(
            '❌ You haven\'t purchased the base alert feature yet!\n' +
            `Use \`/basealert purchase\` (${PURCHASE_PRICE.toLocaleString()} coins)`
        );
    }

    const mapNames = { 'chernarusplus': 'Chernarus', 'enoch': 'Livonia', 'sakhal': 'Sakhal' };
    const mapPaths = { 'chernarusplus': '', 'enoch': 'livonia/', 'sakhal': 'sakhal/' };

    const embed = new MessageEmbed()
        .setColor('#0099FF')
        .setTitle('📍 Base Alert Status')
        .setDescription('Your current base alert configurations:');

    for (const base of basesResult.rows) {
        const whitelistCount = await db.query(
            'SELECT COUNT(*) as count FROM base_alert_whitelist WHERE base_alert_id IN (SELECT id FROM base_alerts WHERE guild_id = $1 AND discord_user_id = $2 AND server_name = $3)',
            [guildId, userId, base.server_name]
        );

        const mapUrl = `https://www.izurvive.com/${mapPaths[base.server_name]}#location=${base.base_x};${base.base_y}`;
        const status = base.is_active ? '🟢 Active' : '🔴 Disabled';

        embed.addFields({
            name: `${mapNames[base.server_name]} ${status}`,
            value: 
                `**Location:** (${base.base_x}, ${base.base_y}) - [Map](${mapUrl})\n` +
                `**Radius:** ${base.alert_radius}m\n` +
                `**Whitelisted:** ${whitelistCount.rows[0].count} players`,
            inline: false
        });
    }

    embed.setFooter({ text: `Relocate fee: ${RELOCATE_PRICE.toLocaleString()} coins per server` });

    await interaction.editReply({ embeds: [embed] });
}
