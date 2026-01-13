// economy_backup.js restored content
const path = require('path');
const fs = require('fs');
const db = require('../database.js');
const { MessageActionRow, MessageButton } = require('discord.js');
const COOLDOWN_FILE = path.join(__dirname, '../logs/economy_cooldowns.json');
const MINI_GAMES = ['fortuneteller','pillage','archery','tarot','quest','liarsdice','smuggle','pickpocket','bribe','labor','questboard','taverndice','duel','joust'];
const COOLDOWN_LIMIT = 1; // times allowed
const COOLDOWN_WINDOW = 6 * 60 * 60 * 1000; // 6 hours in ms

function getCooldowns() {
    if (!fs.existsSync(COOLDOWN_FILE)) fs.writeFileSync(COOLDOWN_FILE, '{}');
    return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
}
function saveCooldowns(cooldowns) {
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2));
}
function canPlayMiniGame(userId, game) {
    const cooldowns = getCooldowns();
    const now = Date.now();
    if (!cooldowns[userId]) cooldowns[userId] = {};
    if (!cooldowns[userId][game]) cooldowns[userId][game] = [];
    // Remove old timestamps
    cooldowns[userId][game] = cooldowns[userId][game].filter(ts => now - ts < COOLDOWN_WINDOW);
    saveCooldowns(cooldowns);
    return cooldowns[userId][game].length < COOLDOWN_LIMIT;
}
function recordMiniGamePlay(userId, game) {
    const cooldowns = getCooldowns();
    const now = Date.now();
    if (!cooldowns[userId]) cooldowns[userId] = {};
    if (!cooldowns[userId][game]) cooldowns[userId][game] = [];
    cooldowns[userId][game].push(now);
    saveCooldowns(cooldowns);
}
function nextAvailableMiniGame(userId, game) {
    const cooldowns = getCooldowns();
    const now = Date.now();
    if (!cooldowns[userId] || !cooldowns[userId][game] || cooldowns[userId][game].length < COOLDOWN_LIMIT) return 0;
    cooldowns[userId][game] = cooldowns[userId][game].filter(ts => now - ts < COOLDOWN_WINDOW);
    const oldest = Math.min(...cooldowns[userId][game]);
    return oldest + COOLDOWN_WINDOW - now;
}
const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client, Intents } = require('discord.js');

const BALANCES_FILE = path.join(__dirname, '../logs/economy_balances.json');
const BANK_FILE = path.join(__dirname, '../logs/economy_banks.json');
const DAYZ_NAMES_FILE = path.join(__dirname, '../dayz_names.json');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure balances and bank files exist (only create if missing, preserve existing data)
try {
    if (!fs.existsSync(BALANCES_FILE)) {
        console.log('[ECONOMY] Creating new economy_balances.json file');
        fs.writeFileSync(BALANCES_FILE, '{}');
    } else {
        // Verify file is readable and valid JSON
        try {
            JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
        } catch (parseErr) {
            console.error('[ECONOMY] WARNING: economy_balances.json is corrupted! Creating backup...');
            fs.copyFileSync(BALANCES_FILE, BALANCES_FILE + '.backup.' + Date.now());
            fs.writeFileSync(BALANCES_FILE, '{}');
        }
    }
    if (!fs.existsSync(BANK_FILE)) {
        console.log('[ECONOMY] Creating new economy_banks.json file');
        fs.writeFileSync(BANK_FILE, '{}');
    } else {
        // Verify file is readable and valid JSON
        try {
            JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
        } catch (parseErr) {
            console.error('[ECONOMY] WARNING: economy_banks.json is corrupted! Creating backup...');
            fs.copyFileSync(BANK_FILE, BANK_FILE + '.backup.' + Date.now());
            fs.writeFileSync(BANK_FILE, '{}');
        }
    }
} catch (err) {
    console.error('[ECONOMY] CRITICAL: Failed to initialize economy files:', err);
}
function getBanks() {
    try {
        return JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
    } catch (err) {
        console.error('[ECONOMY] Error reading banks file:', err);
        return {};
    }
}

function saveBanks(banks) {
    try {
        fs.writeFileSync(BANK_FILE, JSON.stringify(banks, null, 2));
    } catch (err) {
        console.error('[ECONOMY] CRITICAL: Failed to save banks:', err);
    }
}

function addBank(userId, amount) {
    const banks = getBanks();
    if (!banks[userId]) banks[userId] = 0;
    banks[userId] += amount;
    saveBanks(banks);
    return banks[userId];
}

function setBank(userId, amount) {
    const banks = getBanks();
    banks[userId] = amount;
    saveBanks(banks);
    return banks[userId];
}

function getBank(userId) {
    const banks = getBanks();
    return banks[userId] || 0;
}

function getBalances() {
    try {
        return JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
    } catch (err) {
        console.error('[ECONOMY] Error reading balances file:', err);
        return {};
    }
}

function saveBalances(balances) {
    try {
        fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
    } catch (err) {
        console.error('[ECONOMY] CRITICAL: Failed to save balances:', err);
    }
}

// DayZ name management
function getDayZNames() {
    try {
        if (!fs.existsSync(DAYZ_NAMES_FILE)) {
            fs.writeFileSync(DAYZ_NAMES_FILE, '{}');
            return {};
        }
        return JSON.parse(fs.readFileSync(DAYZ_NAMES_FILE, 'utf8'));
    } catch (err) {
        console.error('[ECONOMY] Error reading DayZ names file:', err);
        return {};
    }
}

function saveDayZNames(names) {
    try {
        fs.writeFileSync(DAYZ_NAMES_FILE, JSON.stringify(names, null, 2));
    } catch (err) {
        console.error('[ECONOMY] Error saving DayZ names:', err);
    }
}

function setDayZName(userId, dayzName) {
    const names = getDayZNames();
    names[userId] = dayzName;
    saveDayZNames(names);
}

function getDayZName(userId) {
    const names = getDayZNames();
    return names[userId] || null;
}

function addBalance(userId, amount) {
    const balances = getBalances();
    if (!balances[userId]) balances[userId] = 0;
    balances[userId] += amount;
    saveBalances(balances);
    return balances[userId];
}

function setBalance(userId, amount) {
    const balances = getBalances();
    balances[userId] = amount;
    saveBalances(balances);
    return balances[userId];
}

function getBalance(userId) {
    const balances = getBalances();
    return balances[userId] || 0;
}

function getLeaderboard(top = 10) {
    const balances = getBalances();
    return Object.entries(balances)
        .sort((a, b) => b[1] - a[1])
        .slice(0, top);
}

// ============ RANK SYSTEM FUNCTIONS ============
const RANKS = [
    { name: 'Peasant', emoji: '👨‍🌾', threshold: 0, bonus: 0, stipend: 0, games: ['labor', 'questboard', 'taverndice'] },
    { name: 'Knight', emoji: '⚔️', threshold: 5000, bonus: 0.05, stipend: 0, games: ['archery', 'fortuneteller'] },
    { name: 'Baron', emoji: '🛡️', threshold: 15000, bonus: 0.10, stipend: 0, games: ['duel'] },
    { name: 'Earl', emoji: '🎖️', threshold: 35000, bonus: 0.15, stipend: 100, games: ['joust'] },
    { name: 'Duke', emoji: '👑', threshold: 75000, bonus: 0.20, stipend: 250, games: [] },
    { name: 'King', emoji: '🏰', threshold: 150000, bonus: 0.25, stipend: 500, games: [] }
];

async function getUserStats(guildId, userId) {
    try {
        const result = await db.query(
            'SELECT * FROM user_stats WHERE guild_id = $1 AND user_id = $2',
            [guildId, userId]
        );
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        // Create new stats entry
        await db.query(
            'INSERT INTO user_stats (guild_id, user_id) VALUES ($1, $2)',
            [guildId, userId]
        );
        return {
            guild_id: guildId,
            user_id: userId,
            total_earned: 0,
            total_spent: 0,
            mini_games_played: 0,
            mini_games_won: 0,
            distance_traveled: 0
        };
    } catch (err) {
        console.error('[RANK] Error getting user stats:', err);
        return null;
    }
}

async function updateUserStats(guildId, userId, updates) {
    try {
        const sets = [];
        const values = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(updates)) {
            sets.push(`${key} = ${key} + $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
        
        values.push(guildId, userId);
        await db.query(
            `UPDATE user_stats SET ${sets.join(', ')} WHERE guild_id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
            values
        );
    } catch (err) {
        console.error('[RANK] Error updating user stats:', err);
    }
}

function getRank(totalEarned) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (totalEarned >= RANKS[i].threshold) {
            return RANKS[i];
        }
    }
    return RANKS[0];
}

function getNextRank(currentRank) {
    const currentIndex = RANKS.findIndex(r => r.name === currentRank.name);
    if (currentIndex < RANKS.length - 1) {
        return RANKS[currentIndex + 1];
    }
    return null;
}

function canPlayGame(rank, gameName) {
    const rankIndex = RANKS.findIndex(r => r.name === rank.name);
    for (let i = 0; i <= rankIndex; i++) {
        if (RANKS[i].games.includes(gameName)) {
            return true;
        }
    }
    // Check if it's one of the always-available games
    const alwaysAvailable = ['pillage', 'tarot', 'quest', 'liarsdice', 'smuggle', 'pickpocket', 'bribe'];
    return alwaysAvailable.includes(gameName);
}

function getUnlockedGames(rank) {
    const rankIndex = RANKS.findIndex(r => r.name === rank.name);
    const games = [];
    for (let i = 0; i <= rankIndex; i++) {
        games.push(...RANKS[i].games);
    }
    // Add always-available games
    games.push('pillage', 'tarot', 'quest', 'liarsdice', 'smuggle', 'pickpocket', 'bribe');
    return [...new Set(games)]; // Remove duplicates
}

function getBalance(userId) {
    const balances = getBalances();
    return balances[userId] || 0;
}

module.exports = {
    data: [
        new SlashCommandBuilder()
            .setName('wallet')
            .setDescription('Check your coin purse (balance)'),
        new SlashCommandBuilder()
            .setName('labor')
            .setDescription('⚒️ Toil for coin - Choose thy daily labor (farming, smithing, or stable work)'),
        new SlashCommandBuilder()
            .setName('balance')
            .setDescription('Check your balance (alias for /wallet)'),
        new SlashCommandBuilder()
            .setName('work')
            .setDescription('Earn money (alias for /labor)'),
        new SlashCommandBuilder()
            .setName('pay')
            .setDescription('Pay another user')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to pay')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Amount to pay')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('Show the top 10 richest nobles'),
        new SlashCommandBuilder()
            .setName('fortuneteller')
            .setDescription('🔮 Consult the village oracle - Bet coin on mystical fortune telling'),
        new SlashCommandBuilder()
            .setName('slots')
            .setDescription('Play fortune game (alias for /fortuneteller)'),
        new SlashCommandBuilder()
            .setName('pillage')
            .setDescription('⚔️ Raid another noble\'s coffers - Risk guards catching thee!')
            .addUserOption(option =>
                option.setName('target')
                    .setDescription('Noble whose castle thou shall raid')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('rob')
            .setDescription('Raid another player (alias for /pillage)')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to rob')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('archery')
            .setDescription('🏹 Test thy aim at the archery range - Hit the target for rewards!'),
        new SlashCommandBuilder()
            .setName('golf')
            .setDescription('Archery competition (alias for /archery)'),
        new SlashCommandBuilder()
            .setName('tarot')
            .setDescription('🃏 Draw from the mystical tarot deck - Each card brings fortune or woe'),
        new SlashCommandBuilder()
            .setName('cards')
            .setDescription('Draw a card (alias for /tarot)'),
        new SlashCommandBuilder()
            .setName('quest')
            .setDescription('⚔️ Undertake a quest from the board - Choose thy danger level wisely!'),
        new SlashCommandBuilder()
            .setName('job')
            .setDescription('Take a quest (alias for /quest)'),
        new SlashCommandBuilder()
            .setName('liarsdice')
            .setDescription('🎲 Play Liar\'s Dice in the tavern - Bluff thy way to victory!'),
        new SlashCommandBuilder()
            .setName('blackjack')
            .setDescription('Tavern dice game (alias for /liarsdice)'),
        new SlashCommandBuilder()
            .setName('bank')
            .setDescription('Check your bank balance'),
        new SlashCommandBuilder()
            .setName('deposit')
            .setDescription('Deposit money from wallet to bank')
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Amount to deposit')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('withdraw')
            .setDescription('Withdraw money from bank to wallet')
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Amount to withdraw')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('smuggle')
            .setDescription('🍷 Smuggle contraband past guards - Choose wine, weapons, or secrets!'),
        new SlashCommandBuilder()
            .setName('crime')
            .setDescription('Commit crime (alias for /smuggle)'),
        new SlashCommandBuilder()
            .setName('pickpocket')
            .setDescription('👛 Pickpocket in the marketplace - Steal purses without being caught!'),
        new SlashCommandBuilder()
            .setName('theft')
            .setDescription('Steal from others (alias for /pickpocket)'),
        new SlashCommandBuilder()
            .setName('bribe')
            .setDescription('💰 Bribe the castle guards - Higher coin purses yield better favors!'),
        new SlashCommandBuilder()
            .setName('questboard')
            .setDescription('📜 Simple quests for peasants - Earn coin with basic tasks'),
        new SlashCommandBuilder()
            .setName('taverndice')
            .setDescription('🎲 Roll knucklebones in the tavern - Bet on thy dice!'),
        new SlashCommandBuilder()
            .setName('duel')
            .setDescription('⚔️ Challenge a noble to honorable combat - Winner takes all!')
            .addUserOption(option =>
                option.setName('opponent')
                    .setDescription('Noble to challenge')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('stakes')
                    .setDescription('Amount to wager (min $50)')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('joust')
            .setDescription('🏇 Enter the grand jousting tournament - $100 entry, glory awaits!'),
        new SlashCommandBuilder()
            .setName('rank')
            .setDescription('👑 View thy noble rank and progression'),
        new SlashCommandBuilder()
            .setName('addmoney')
            .setDescription('Admin: Add money to a user')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to give money to')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Amount to add')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('shop')
            .setDescription('View and purchase items from the shop')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Item to purchase (leave blank to view shop)')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('setname')
            .setDescription('Set your DayZ player name for spawn locations')
            .addStringOption(option =>
                option.setName('name')
                    .setDescription('Your exact DayZ player name')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('myname')
            .setDescription('Check your registered DayZ player name'),
        new SlashCommandBuilder()
            .setName('imhere')
            .setDescription('Check your last known location on the server'),
        new SlashCommandBuilder()
            .setName('shophelp')
            .setDescription('Learn how to use the shop and spawn system'),
    ],
    async execute(interaction) {
        console.log(`[ECONOMY] execute called for command: ${interaction.commandName}, channel: ${interaction.channelId}`);
        const { commandName } = interaction;
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const { MessageEmbed } = require('discord.js');
        
        // Get guild config for channel IDs
        const guildConfig = await db.getGuildConfig(guildId);
        if (!guildConfig) {
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#ff5555')
                        .setTitle('Server Not Configured')
                        .setDescription('This server has not been set up yet. An admin must run `/admin killfeed setup` first.')
                ],
                ephemeral: true
            });
            return;
        }
        
        const SHOP_CHANNEL_ID = guildConfig.shop_channel_id;
        const ECONOMY_CHANNEL_ID = guildConfig.economy_channel_id;
        
        if (interaction.commandName === 'shop') {
            console.log('[SHOP] Entered /shop logic');
            try {
                console.log('[SHOP] Channel check');
                if (interaction.channelId !== SHOP_CHANNEL_ID) {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#ff5555')
                                .setTitle('Wrong Channel')
                                .setDescription('Please use this command in the <#' + SHOP_CHANNEL_ID + '> channel.')
                                .setFooter({ text: 'Shop', iconURL: interaction.client.user.displayAvatarURL() })
                        ],
                        ephemeral: true
                    });
                    return;
                }
                console.log('[SHOP] Passed channel check');
                // --- SHOP COMMAND LOGIC ---
                const shopItems = require('../shop_items.js');
                const itemName = interaction.options.getString('item');
                if (!itemName) {
                    console.log('[SHOP] No itemName, showing shop menu');
                    // Paginate shop items to avoid Discord's 4096 character limit
                    const ITEMS_PER_PAGE = 20;
                    const pages = [];
                    for (let i = 0; i < shopItems.length; i += ITEMS_PER_PAGE) {
                        const chunk = shopItems.slice(i, i + ITEMS_PER_PAGE);
                        let desc = '';
                        for (const item of chunk) {
                            desc += `**${item.name}** — $${item.averagePrice}\n`;
                        }
                        pages.push(desc);
                    }
                    
                    // Send first page with navigation buttons
                    let currentPage = 0;
                    const row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('prev_page')
                                .setLabel('◀ Previous')
                                .setStyle('PRIMARY')
                                .setDisabled(true),
                            new MessageButton()
                                .setCustomId('next_page')
                                .setLabel('Next ▶')
                                .setStyle('PRIMARY')
                                .setDisabled(pages.length <= 1)
                        );
                    
                    const message = await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#ff69b4')
                                .setTitle('DayZ Shop')
                                .setDescription(pages[currentPage])
                                .setFooter({ text: `Page ${currentPage + 1}/${pages.length} • Use /shop item:<name> to purchase.` })
                        ],
                        components: [row],
                        fetchReply: true
                    });
                    
                    // Create button collector with filter
                    const filter = i => i.user.id === interaction.user.id;
                    const collector = message.createMessageComponentCollector({ 
                        filter, 
                        componentType: 'BUTTON',
                        time: 300000 
                    }); // 5 minutes
                    
                    collector.on('collect', async i => {
                        if (i.customId === 'prev_page') {
                            currentPage = Math.max(0, currentPage - 1);
                        } else if (i.customId === 'next_page') {
                            currentPage = Math.min(pages.length - 1, currentPage + 1);
                        }
                        
                        const newRow = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId('prev_page')
                                    .setLabel('◀ Previous')
                                    .setStyle('PRIMARY')
                                    .setDisabled(currentPage === 0),
                                new MessageButton()
                                    .setCustomId('next_page')
                                    .setLabel('Next ▶')
                                    .setStyle('PRIMARY')
                                    .setDisabled(currentPage === pages.length - 1)
                            );
                        
                        await i.update({
                            embeds: [
                                new MessageEmbed()
                                    .setColor('#ff69b4')
                                    .setTitle('DayZ Shop')
                                    .setDescription(pages[currentPage])
                                    .setFooter({ text: `Page ${currentPage + 1}/${pages.length} • Use /shop item:<name> to purchase.` })
                            ],
                            components: [newRow]
                        });
                    });
                    
                    collector.on('end', () => {
                        // Disable buttons after timeout
                        const disabledRow = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId('prev_page')
                                    .setLabel('◀ Previous')
                                    .setStyle('PRIMARY')
                                    .setDisabled(true),
                                new MessageButton()
                                    .setCustomId('next_page')
                                    .setLabel('Next ▶')
                                    .setStyle('PRIMARY')
                                    .setDisabled(true)
                            );
                        message.edit({ components: [disabledRow] }).catch(() => {});
                    });
                    
                    console.log('[SHOP] Shop menu sent');
                    return;
                }
                console.log('[SHOP] Looking for item:', itemName);
                const item = shopItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
                if (!item) {
                    console.log('[SHOP] Item not found:', itemName);
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#ff5555')
                                .setTitle('Item Not Found')
                                .setDescription('That item does not exist in the shop.')
                        ], ephemeral: true
                    });
                    return;
                }
                // Check balance
                const bal = await db.getBalance(guildId, userId);
                if (bal < item.averagePrice) {
                    console.log('[SHOP] Insufficient funds:', bal, 'needed:', item.averagePrice);
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#ffaa00')
                                .setTitle('Insufficient Funds')
                                .setDescription(`You need $${item.averagePrice} to buy ${item.name}. Your balance: $${bal}`)
                        ], ephemeral: true
                    });
                    return;
                }
                // Deduct money
                await db.addBalance(guildId, userId, -item.averagePrice);
                // Get registered DayZ name or use Discord username
                const dayzName = await db.getDayZName(guildId, userId) || interaction.user.username;
                // Write spawn entry to Cupid.json via Nitrado API
                const { addCupidSpawnEntry } = require('../index.js');
                const spawnEntry = {
                    userId,
                    dayzPlayerName: dayzName,
                    item: item.name,
                    class: item.class,
                    amount: item.amount || 1,
                    timestamp: Date.now(),
                    restart_id: Date.now().toString()
                };
                // Reply immediately before FTP upload (Discord has 3s timeout)
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#00ff99')
                            .setTitle('Purchase Successful!')
                            .setDescription(`You bought **${item.name}** for $${item.averagePrice}. Writing spawn entry...`)
                    ]
                });
                
                try {
                    console.log('[SHOP] Adding Cupid spawn entry:', spawnEntry);
                    await addCupidSpawnEntry(spawnEntry, guildId);
                    console.log('[SHOP] Purchase successful, spawn entry written');
                    // Update the message to confirm spawn was written
                    await interaction.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#00ff99')
                                .setTitle('Purchase Successful!')
                                .setDescription(`You bought **${item.name}** for $${item.averagePrice}. It will spawn at your location after the next restart! ✅`)
                        ]
                    });
                } catch (err) {
                    console.error('[SHOP] Error writing spawn entry:', err);
                    // Update the message to show error
                    await interaction.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#ff5555')
                                .setTitle('Spawn Error')
                                .setDescription('Purchase succeeded, but failed to write spawn entry. Please contact an admin.')
                        ]
                    });
                }
                return;
            } catch (err) {
                console.error('[SHOP] Fatal error in /shop logic:', err);
                try {
                    await interaction.reply({ content: 'Fatal error in /shop logic: ' + err.message, ephemeral: true });
                } catch {}
                return;
            }
        }
        
        // Check if command is in wrong channel (excluding shop which has its own check above)
        if (interaction.channelId !== ECONOMY_CHANNEL_ID) {
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#ff5555')
                        .setTitle('Wrong Channel')
                        .setDescription('Please use this command in the <#' + ECONOMY_CHANNEL_ID + '> channel.')
                        .setFooter({ text: 'Economy Bot', iconURL: interaction.client.user.displayAvatarURL() })
                ],
                ephemeral: true
            });
            return;
        }
        // Mini-game cooldown check
        if (MINI_GAMES.includes(commandName)) {
            const cooldowns = await db.getCooldowns(guildId, userId, commandName);
            const now = Date.now();
            const recentPlays = cooldowns.filter(ts => now - ts < COOLDOWN_WINDOW);
            
            if (recentPlays.length >= COOLDOWN_LIMIT) {
                const oldest = Math.min(...recentPlays);
                const ms = oldest + COOLDOWN_WINDOW - now;
                const h = Math.floor(ms / (60*60*1000));
                const m = Math.floor((ms % (60*60*1000)) / (60*1000));
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ffaa00')
                            .setTitle('Cooldown')
                            .setDescription(`⏳ You can only play **/${commandName}** twice every 12 hours.\nTry again in **${h}h ${m}m**.`)
                            .setFooter({ text: 'Economy Bot', iconURL: interaction.client.user.displayAvatarURL() })
                    ],
                    ephemeral: true
                });
                return;
            }
            // Record cooldown in database
            await db.addCooldown(guildId, userId, commandName, Date.now());
            // Clean old cooldowns
            await db.cleanOldCooldowns(guildId, userId, commandName, COOLDOWN_WINDOW);
        }

        if (commandName === 'balance') {
            const bal = await db.getBalance(guildId, userId);
            const bank = await db.getBank(guildId, userId);
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#00ff99')
                        .setTitle('💰 Your Balance')
                        .addField('Wallet', `$${bal}`, true)
                        .addField('Bank', `$${bank}`, true)
                        .setFooter({ text: 'Economy Bot', iconURL: interaction.client.user.displayAvatarURL() })
                ]
            });
        } else if (commandName === 'wallet') {
            const bal = await db.getBalance(guildId, userId);
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#00ff99')
                        .setTitle('Wallet Balance')
                        .setDescription(`You have **$${bal}** in your wallet.`)
                        .setFooter({ text: 'Economy Bot', iconURL: interaction.client.user.displayAvatarURL() })
                ]
            });
        } else if (commandName === 'bank') {
            const bank = await db.getBank(guildId, userId);
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#00aaff')
                        .setTitle('Bank Balance')
                        .setDescription(`You have **$${bank}** in your bank.`)
                        .setFooter({ text: 'Economy Bot', iconURL: interaction.client.user.displayAvatarURL() })
                ]
            });
        } else if (commandName === 'deposit') {
            const amount = interaction.options.getInteger('amount');
            const bal = await db.getBalance(guildId, userId);
            const { MessageEmbed } = require('discord.js');
            if (amount <= 0) {
                await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffaa00').setTitle('Deposit Failed').setDescription('Amount must be positive.')] });
                return;
            }
            if (bal < amount) {
                await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffaa00').setTitle('Deposit Failed').setDescription('You do not have enough in your wallet.')] });
                return;
            }
            await db.addBalance(guildId, userId, -amount);
            const newBank = await db.addBank(guildId, userId, amount);
            await interaction.reply({ embeds: [new MessageEmbed().setColor('#00aaff').setTitle('💸 Deposit Successful').addField('Amount', `$${amount}`, true).addField('New Bank Balance', `$${newBank}`, true)] });
        } else if (commandName === 'withdraw') {
            const amount = interaction.options.getInteger('amount');
            const bank = await db.getBank(guildId, userId);
            const { MessageEmbed } = require('discord.js');
            if (amount <= 0) {
                await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffaa00').setTitle('Withdraw Failed').setDescription('Amount must be positive.')] });
                return;
            }
            if (bank < amount) {
                await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffaa00').setTitle('Withdraw Failed').setDescription('You do not have enough in your bank.')] });
                return;
            }
            await db.addBank(guildId, userId, -amount);
            const newBal = await db.addBalance(guildId, userId, amount);
            await interaction.reply({ embeds: [new MessageEmbed().setColor('#00aaff').setTitle('🏦 Withdraw Successful').addField('Amount', `$${amount}`, true).addField('New Wallet Balance', `$${newBal}`, true)] });
        } else if (commandName === 'work') {
            const earned = Math.floor(Math.random() * 100) + 50;
            const bal = await db.addBalance(guildId, userId, earned);
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({ embeds: [new MessageEmbed().setColor('#43b581').setTitle('🛠️ Work').setDescription(`You worked and earned **$${earned}**!`).addField('New Balance', `$${bal}`, true)] });
        } else if (commandName === 'pay') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const { MessageEmbed } = require('discord.js');
            if (amount <= 0) {
                await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffaa00').setTitle('Payment Failed').setDescription('Amount must be positive.')] });
                return;
            }
            const bal = await db.getBalance(guildId, userId);
            if (bal < amount) {
                await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffaa00').setTitle('Payment Failed').setDescription('You do not have enough funds.')] });
                return;
            }
            await db.addBalance(guildId, userId, -amount);
            await db.addBalance(guildId, target.id, amount);
            await interaction.reply({ embeds: [new MessageEmbed().setColor('#00ff99').setTitle('💸 Payment Sent').setDescription(`You paid **$${amount}** to <@${target.id}>.`)] });
        } else if (commandName === 'leaderboard') {
            const top = await db.getLeaderboard(guildId, 10);
            const { MessageEmbed } = require('discord.js');
            let desc = '';
            for (let i = 0; i < top.length; i++) {
                desc += `**#${i + 1}** <@${top[i][0]}>: $${top[i][1]}\n`;
            }
            await interaction.reply({ embeds: [new MessageEmbed().setColor('#ffd700').setTitle('🏆 Economy Leaderboard').setDescription(desc)] });
        } else if (commandName === 'slots') {
            // Simple slot machine
            const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎'];
            const spin = [0, 0, 0].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
            let reward = 0;
            if (spin[0] === spin[1] && spin[1] === spin[2]) reward = 500;
            else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) reward = 100;
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({ embeds: [
                new MessageEmbed()
                    .setColor(reward > 0 ? '#43b581' : '#ff5555')
                    .setTitle('🎰 Slot Machine')
                    .setDescription(`[${spin.join(' ')}]`)
                    .addField('Result', reward > 0 ? `You won **$${reward}**!` : 'No win this time.', true)
                    .addField('Balance', `$${await db.addBalance(guildId, userId, reward)}`, true)
            ] });
        } else if (commandName === 'rob') {
            const target = interaction.options.getUser('user');
            if (target.id === userId) {
                await interaction.reply('You cannot rob yourself!');
                return;
            }
            const targetBal = await db.getBalance(guildId, target.id);
            if (targetBal < 100) {
                await interaction.reply('Target is too poor to rob!');
                return;
            }
            const success = Math.random() < 0.5;
            if (success) {
                const amount = Math.floor(Math.random() * Math.min(200, targetBal));
                await db.addBalance(guildId, userId, amount);
                await db.addBalance(guildId, target.id, -amount);
                await interaction.reply(`You robbed ${target.username} and got $${amount}!`);
            } else {
                const penalty = Math.floor(Math.random() * 100) + 20;
                await db.addBalance(guildId, userId, -penalty);
                await interaction.reply(`Robbery failed! You lost $${penalty}.`);
            }
        } else if (commandName === 'golf') {
            const strokes = Math.floor(Math.random() * 5) + 1;
            const reward = 150 - strokes * 20;
            const bal = await db.addBalance(guildId, userId, reward);
            await interaction.reply(`⛳ You played golf and finished in ${strokes} strokes! You earned $${reward}. Balance: $${bal}`);
        } else if (commandName === 'cards') {
            const suits = ['♠', '♥', '♦', '♣'];
            const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            const card = `${values[Math.floor(Math.random() * values.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;
            await interaction.reply(`🃏 You drew: ${card}`);
        } else if (commandName === 'job') {
            const jobs = [
                { name: 'Farmer', pay: 120 },
                { name: 'Hunter', pay: 150 },
                { name: 'Fisherman', pay: 100 },
                { name: 'Mechanic', pay: 180 },
                { name: 'Medic', pay: 200 },
                { name: 'Bartender', pay: 90 },
                { name: 'Guard', pay: 130 }
            ];
            const job = jobs[Math.floor(Math.random() * jobs.length)];
            const bal = await db.addBalance(guildId, userId, job.pay);
            await interaction.reply(`👷 You worked as a ${job.name} and earned $${job.pay}! Balance: $${bal}`);
        } else if (commandName === 'blackjack') {
            // Simple blackjack: player vs bot, one round
            function drawCard() {
                const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
                return values[Math.floor(Math.random() * values.length)];
            }
            let player = drawCard() + drawCard();
            let bot = drawCard() + drawCard();
            let result = '';
            if (player > 21) result = 'You busted!';
            else if (bot > 21 || player > bot) {
                await db.addBalance(guildId, userId, 200);
                result = 'You win $200!';
            } else if (player < bot) {
                await db.addBalance(guildId, userId, -100);
                result = 'You lose $100!';
            } else {
                result = 'It\'s a tie!';
            }
            await interaction.reply(`🃏 Blackjack! You: ${player} | Bot: ${bot} — ${result}`);
        } else if (commandName === 'crime') {
            const crimes = [
                { name: 'bank robbery', reward: 500, penalty: 250 },
                { name: 'car theft', reward: 300, penalty: 150 },
                { name: 'shoplifting', reward: 100, penalty: 50 },
                { name: 'hacking', reward: 400, penalty: 200 },
                { name: 'pickpocketing', reward: 80, penalty: 40 }
            ];
            const crime = crimes[Math.floor(Math.random() * crimes.length)];
            const success = Math.random() < 0.5;
            if (success) {
                const bal = await db.addBalance(guildId, userId, crime.reward);
                await interaction.reply(`🚨 You successfully committed ${crime.name} and earned $${crime.reward}! Balance: $${bal}`);
            } else {
                const bal = await db.addBalance(guildId, userId, -crime.penalty);
                await interaction.reply(`🚓 You got caught committing ${crime.name} and lost $${crime.penalty}! Balance: $${bal}`);
            }
        } else if (commandName === 'theft') {
            const targets = ['a store', 'a house', 'a car', 'a bank', 'a museum'];
            const target = targets[Math.floor(Math.random() * targets.length)];
            const success = Math.random() < 0.4;
            if (success) {
                const reward = Math.floor(Math.random() * 300) + 50;
                const bal = await db.addBalance(guildId, userId, reward);
                await interaction.reply(`🕵️ You successfully stole from ${target} and got $${reward}! Balance: $${bal}`);
            } else {
                const penalty = Math.floor(Math.random() * 100) + 20;
                const failBal = await db.addBalance(guildId, userId, -penalty);
                await interaction.reply(`🚔 You failed to steal from ${target} and lost $${penalty}! Balance: $${failBal}`);
            }
        } else if (commandName === 'bribe') {
            const officials = ['a police officer', 'a mayor', 'a guard', 'a judge'];
            const official = officials[Math.floor(Math.random() * officials.length)];
            const success = Math.random() < 0.3;
            if (success) {
                const reward = Math.floor(Math.random() * 400) + 100;
                const bal = await db.addBalance(guildId, userId, reward);
                await interaction.reply(`💸 You bribed ${official} and gained $${reward}! Balance: $${bal}`);
            } else {
                const penalty = Math.floor(Math.random() * 200) + 50;
                const bal = await db.addBalance(guildId, userId, -penalty);
                await interaction.reply(`❌ Your bribe to ${official} failed and you lost $${penalty}! Balance: $${bal}`);
            }
        } else if (commandName === 'addmoney') {
            // Only allow admins to use this command
            if (!interaction.memberPermissions || !interaction.memberPermissions.has('ADMINISTRATOR')) {
                await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                return;
            }
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            if (amount === 0) {
                await interaction.reply('Amount must not be zero.');
                return;
            }
            await db.addBalance(guildId, target.id, amount);
            await interaction.reply(`Added $${amount} to ${target.username}'s balance.`);
        } else if (commandName === 'setname') {
            const dayzName = interaction.options.getString('name');
            await db.setDayZName(guildId, userId, dayzName);
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#00ff99')
                        .setTitle('DayZ Name Set')
                        .setDescription(`Your DayZ player name has been set to: **${dayzName}**\n\nItems purchased from the shop will now spawn at your in-game location!`)
                ], ephemeral: true
            });
        } else if (commandName === 'myname') {
            const dayzName = await db.getDayZName(guildId, userId);
            if (!dayzName) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ffaa00')
                            .setTitle('No DayZ Name Set')
                            .setDescription('You have not set your DayZ player name yet.\n\nUse `/setname` to set it so items spawn at your location!')
                    ], ephemeral: true
                });
            } else {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#00aaff')
                            .setTitle('Your DayZ Name')
                            .setDescription(`**${dayzName}**\n\nYou can change it anytime with \`/setname\``)
                    ], ephemeral: true
                });
            }
        } else if (commandName === 'imhere') {
            const dayzName = await db.getDayZName(guildId, userId);
            if (!dayzName) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ffaa00')
                            .setTitle('❌ No DayZ Name Set')
                            .setDescription('You need to set your DayZ name first!\n\nUse `/setname name:YourDayZName`')
                    ], ephemeral: true
                });
                return;
            }

            // Get location from database
            const location = await db.getPlayerLocation(guildId, dayzName);
            
            if (!location) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ffaa00')
                            .setTitle('📍 No Location Found')
                            .setDescription(`**DayZ Name:** ${dayzName}\n\nYour location hasn't been tracked yet. Make sure you:\n• Have been on the server recently\n• Are online so the bot can track you\n\nThe bot updates locations every 2 minutes from server logs.`)
                    ], ephemeral: true
                });
            } else {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#00ff99')
                            .setTitle('📍 Your Last Known Location')
                            .setDescription(`**DayZ Name:** ${dayzName}`)
                            .addField('Position', `X: ${location.x}\nY: ${location.y}\nZ: ${location.z} (elevation)`, false)
                            .addField('Spawn Format', `[${location.x}, ${location.z}, ${location.y}]`, false)
                            .setFooter({ text: 'Items will spawn at this location after the next server restart' })
                    ], ephemeral: true
                });
            }
        // ============ RANK COMMAND ============
        } else if (commandName === 'rank') {
            const stats = await getUserStats(guildId, userId);
            if (!stats) {
                await interaction.reply({ content: 'Error loading stats!', ephemeral: true });
                return;
            }
            const rank = getRank(stats.total_earned);
            const nextRank = getNextRank(rank);
            const unlockedGames = getUnlockedGames(rank);
            const { MessageEmbed } = require('discord.js');
            
            const embed = new MessageEmbed()
                .setColor('#ffd700')
                .setTitle(`${rank.emoji} ${rank.name}`)
                .setDescription(`<@${userId}>, thou art a noble ${rank.name}!`)
                .addField('💰 Total Earned', `$${stats.total_earned}`, true)
                .addField('🎮 Games Played', `${stats.mini_games_played}`, true)
                .addField('🏆 Games Won', `${stats.mini_games_won}`, true)
                .addField('🎁 Rank Bonus', `+${Math.round(rank.bonus * 100)}% on all earnings`, true)
                .addField('💵 Daily Stipend', rank.stipend > 0 ? `$${rank.stipend}/day` : 'None', true);
            
            if (nextRank) {
                const progress = stats.total_earned - rank.threshold;
                const needed = nextRank.threshold - rank.threshold;
                const percent = Math.min(100, Math.round((progress / needed) * 100));
                const progressBar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
                embed.addField(`📈 Progress to ${nextRank.emoji} ${nextRank.name}`, 
                    `${progressBar} ${percent}%\n$${stats.total_earned}/$${nextRank.threshold}`, false);
            } else {
                embed.addField('👑 Achievement', 'Thou hast reached the highest rank!', false);
            }
            
            embed.addField('🎮 Unlocked Games', unlockedGames.map(g => `\`/${g}\``).join(', '), false);
            await interaction.reply({ embeds: [embed] });
            
        // ============ MEDIEVAL MINI-GAMES ============
        } else if (['labor', 'work'].includes(commandName)) {
            if (!canPlayMiniGame(userId, 'labor')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Thou art weary! Rest until <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('labor_farm').setLabel('🌾 Farm Fields').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('labor_forge').setLabel('⚒️ Work Forge').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('labor_stable').setLabel('🐴 Tend Stables').setStyle('PRIMARY')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle('⚒️ Daily Labor')
                        .setDescription('Choose thy toil for the day, peasant!')
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                const jobs = {
                    labor_farm: { name: 'Farm Fields', desc: 'plowed the fields', min: 50, max: 150 },
                    labor_forge: { name: 'Work Forge', desc: 'toiled at the forge', min: 60, max: 140 },
                    labor_stable: { name: 'Tend Stables', desc: 'tended the horses', min: 70, max: 130 }
                };
                const job = jobs[i.customId];
                const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
                const bonusEarned = Math.floor(earned * (1 + rank.bonus));
                
                await db.addBalance(guildId, userId, bonusEarned);
                if (stats) await updateUserStats(guildId, userId, { total_earned: bonusEarned, mini_games_played: 1 });
                recordMiniGamePlay(userId, 'labor');
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#43b581')
                            .setTitle('⚒️ Labor Complete!')
                            .setDescription(`Thou hast ${job.desc} and earned **$${bonusEarned}**!`)
                            .addField('Base Reward', `$${earned}`, true)
                            .addField(`${rank.emoji} ${rank.name} Bonus`, `+${Math.round(rank.bonus * 100)}%`, true)
                    ],
                    components: []
                });
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ Time expired! The work day hath ended.', components: [], embeds: [] });
                }
            });
            
        } else if (commandName === 'shophelp') {
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#00aaff')
                        .setTitle('🛒 Shop & Spawn System Guide')
                        .setDescription('**How to buy items and spawn them in-game:**')
                        .addField('1️⃣ Set Your DayZ Name', 
                            '`/setname name:YourExactDayZName`\nMust match your in-game name exactly!', false)
                        .addField('2️⃣ Check Your Name', 
                            '`/myname` - Verify your registered name', false)
                        .addField('3️⃣ Browse the Shop', 
                            '`/shop` - View all available items and prices', false)
                        .addField('4️⃣ Purchase an Item', 
                            '`/shop item:canteen` - Buy an item from the shop', false)
                        .addField('📍 Location System', 
                            '• Items spawn at your **last known location**\n• Bot tracks your position from server logs\n• Make sure you\'ve been on the server recently\n• Items will spawn at your location after next restart', false)
                        .addField('🔄 Restart Schedule', 
                            '**Server restarts:** 3, 6, 9, 12 (AM/PM) EST\n• Purchased items spawn on next restart\n• Items spawn once and are removed from spawn list\n• Buy anytime - spawns on next scheduled restart', false)
                        .addField('💰 Earn Money', 
                            'Medieval mini-games! Use `/rank` to see unlocked games.\n⏳ Each can be used once every 6 hours', false)
                        .setFooter({ text: 'Need help? Ask an admin!' })
                ], ephemeral: true
            });
        }
    }
};

// Auto-backup function to prevent data loss
function createBackup() {
    const backupDir = path.join(__dirname, '../logs/backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    try {
        if (fs.existsSync(BALANCES_FILE)) {
            fs.copyFileSync(BALANCES_FILE, path.join(backupDir, `economy_balances_${timestamp}.json`));
        }
        if (fs.existsSync(BANK_FILE)) {
            fs.copyFileSync(BANK_FILE, path.join(backupDir, `economy_banks_${timestamp}.json`));
        }
        console.log(`[ECONOMY] Backup created at ${timestamp}`);
        
        // Clean old backups (keep only last 10)
        const files = fs.readdirSync(backupDir).sort().reverse();
        const balanceBackups = files.filter(f => f.startsWith('economy_balances_'));
        const bankBackups = files.filter(f => f.startsWith('economy_banks_'));
        
        if (balanceBackups.length > 10) {
            for (let i = 10; i < balanceBackups.length; i++) {
                fs.unlinkSync(path.join(backupDir, balanceBackups[i]));
            }
        }
        if (bankBackups.length > 10) {
            for (let i = 10; i < bankBackups.length; i++) {
                fs.unlinkSync(path.join(backupDir, bankBackups[i]));
            }
        }
    } catch (err) {
        console.error('[ECONOMY] Failed to create backup:', err);
    }
}

// Create backup every 6 hours (21600000 ms)
setInterval(createBackup, 6 * 60 * 60 * 1000);
// Create initial backup on load
createBackup();
