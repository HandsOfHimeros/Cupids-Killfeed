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
            .setName('pillage')
            .setDescription('⚔️ Raid another noble\'s coffers - Risk guards catching thee!')
            .addUserOption(option =>
                option.setName('target')
                    .setDescription('Noble whose castle thou shall raid')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('archery')
            .setDescription('🏹 Test thy aim at the archery range - Hit the target for rewards!'),
        new SlashCommandBuilder()
            .setName('tarot')
            .setDescription('🃏 Draw from the mystical tarot deck - Each card brings fortune or woe'),
        new SlashCommandBuilder()
            .setName('quest')
            .setDescription('⚔️ Undertake a quest from the board - Choose thy danger level wisely!'),
        new SlashCommandBuilder()
            .setName('liarsdice')
            .setDescription('🎲 Play Liar\'s Dice in the tavern - Bluff thy way to victory!'),
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
            .setName('pickpocket')
            .setDescription('👛 Pickpocket in the marketplace - Steal purses without being caught!'),
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

        if (commandName === 'wallet') {
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
        } else if (commandName === 'labor_old_handler') {
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
        } else if (commandName === 'fortuneteller') {
            if (!canPlayMiniGame(userId, 'fortuneteller')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ The oracle rests! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const { MessageEmbed } = require('discord.js');
            const symbols = ['🗡️', '👑', '🛡️', '💎', '⚱️'];
            
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#9b59b6')
                        .setTitle('🔮 Fortune Teller')
                        .setDescription('*The mystic peers into her crystal orb...*\n\n🔮 🔮 🔮')
                ]
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const spin = [0, 0, 0].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
            let baseReward = 0;
            let outcome = '';
            
            if (spin[0] === spin[1] && spin[1] === spin[2]) {
                baseReward = 500;
                outcome = '**✨ Three of a kind! The spirits favor thee greatly!**';
            } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
                baseReward = 100;
                outcome = '**⭐ A pair! Fortune smiles upon thee!**';
            } else {
                baseReward = 0;
                outcome = '*The mists are unclear... No fortune this time.*';
            }
            
            const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
            if (bonusReward > 0) await db.addBalance(guildId, userId, bonusReward);
            if (stats) await updateUserStats(guildId, userId, { 
                total_earned: bonusReward, 
                mini_games_played: 1,
                mini_games_won: bonusReward > 0 ? 1 : 0
            });
            recordMiniGamePlay(userId, 'fortuneteller');
            
            await interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setColor(bonusReward > 0 ? '#43b581' : '#95a5a6')
                        .setTitle('🔮 The Oracle Speaks')
                        .setDescription(`**[${spin.join(' ')}]**\n\n${outcome}`)
                        .addField('Base Fortune', baseReward > 0 ? `$${baseReward}` : 'None', true)
                        .addField(`${rank.emoji} Bonus`, bonusReward > baseReward ? `+$${bonusReward - baseReward}` : 'None', true)
                        .setFooter({ text: 'The mists swirl and fade...' })
                ]
            });
        } else if (commandName === 'pillage') {
            if (!canPlayMiniGame(userId, 'pillage')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Thou art too exhausted! Rest until <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const target = interaction.options.getUser('target');
            if (target.id === userId) {
                await interaction.reply({ content: '⚔️ Thou cannot raid thine own coffers!', ephemeral: true });
                return;
            }
            if (target.bot) {
                await interaction.reply({ content: '🤖 Thou cannot raid a bot!', ephemeral: true });
                return;
            }
            
            const targetBal = await db.getBalance(guildId, target.id);
            if (targetBal < 100) {
                await interaction.reply({ content: `💰 ${target.username} hath no coin worth pillaging!`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('pillage_raid').setLabel('⚔️ Raid Castle').setStyle('DANGER'),
                    new MessageButton().setCustomId('pillage_retreat').setLabel('🏃 Retreat').setStyle('SECONDARY')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#e74c3c')
                        .setTitle('⚔️ Pillage')
                        .setDescription(`Thou approach the castle of **${target.username}**...\n\n🏰 Guards patrol the walls\n💰 Estimated loot: $${Math.min(200, targetBal)}`)
                        .addField('Risk', 'Guards may catch thee!', true)
                        .addField('Reward', 'Steal coin if successful', true)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                if (i.customId === 'pillage_retreat') {
                    await i.update({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#95a5a6')
                                .setTitle('🏃 Retreat')
                                .setDescription('Thou hast wisely fled! No coin gained, no coin lost.')
                        ],
                        components: []
                    });
                    return;
                }
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle('⚔️ Raid in Progress')
                            .setDescription('🌙 Sneaking through the shadows...')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const success = Math.random() < 0.5;
                if (success) {
                    const amount = Math.floor(Math.random() * Math.min(200, targetBal)) + 50;
                    const bonusAmount = Math.floor(amount * (1 + rank.bonus));
                    await db.addBalance(guildId, userId, bonusAmount);
                    await db.addBalance(guildId, target.id, -amount);
                    if (stats) await updateUserStats(guildId, userId, { total_earned: bonusAmount, mini_games_played: 1, mini_games_won: 1 });
                    recordMiniGamePlay(userId, 'pillage');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#43b581')
                                .setTitle('⚔️ Raid Successful!')
                                .setDescription(`Thou hast escaped with **$${bonusAmount}** from ${target.username}'s coffers!`)
                                .addField('Stolen', `$${amount}`, true)
                                .addField(`${rank.emoji} Bonus`, `+$${bonusAmount - amount}`, true)
                                .setFooter({ text: 'The guards never saw thee!' })
                        ]
                    });
                } else {
                    const penalty = Math.floor(Math.random() * 100) + 50;
                    await db.addBalance(guildId, userId, -penalty);
                    if (stats) await updateUserStats(guildId, userId, { mini_games_played: 1 });
                    recordMiniGamePlay(userId, 'pillage');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#e74c3c')
                                .setTitle('🛡️ Caught!')
                                .setDescription(`The guards caught thee! Lost **$${penalty}** in fines!`)
                                .setFooter({ text: 'Better luck next time, knave!' })
                        ]
                    });
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ Thou didst hesitate too long! The moment hath passed.', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'archery') {
            if (!canPlayMiniGame(userId, 'archery')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Thy arm needs rest! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('archery_shoot').setLabel('🏹 Draw Bow').setStyle('PRIMARY')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#2ecc71')
                        .setTitle('🏹 Archery Range')
                        .setDescription('Stand at the line and draw thy bow!\n\n```\n      🎯\n   ●  ●  ●\n  ●●  ●  ●●\n   ●  ●  ●\n```')
                        .addField('Bullseye', '$400', true)
                        .addField('Inner Ring', '$300', true)
                        .addField('Outer Ring', '$150', true)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle('🏹 Releasing Arrow...')
                            .setDescription('*The arrow flies through the air...*')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const roll = Math.random();
                let baseReward = 0;
                let hit = '';
                
                if (roll < 0.15) { // 15% bullseye
                    baseReward = 400;
                    hit = '🎯 **BULLSEYE!** Perfect shot!';
                } else if (roll < 0.40) { // 25% inner ring
                    baseReward = 300;
                    hit = '⭐ **Inner Ring!** Excellent aim!';
                } else if (roll < 0.70) { // 30% outer ring
                    baseReward = 150;
                    hit = '✓ **Outer Ring!** Decent shot!';
                } else { // 30% miss
                    baseReward = 0;
                    hit = '❌ **Miss!** The arrow flies wide!';
                }
                
                const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
                if (bonusReward > 0) await db.addBalance(guildId, userId, bonusReward);
                if (stats) await updateUserStats(guildId, userId, { 
                    total_earned: bonusReward, 
                    mini_games_played: 1,
                    mini_games_won: bonusReward > 0 ? 1 : 0
                });
                recordMiniGamePlay(userId, 'archery');
                
                await i.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(bonusReward > 0 ? '#43b581' : '#e74c3c')
                            .setTitle('🏹 Shot Result')
                            .setDescription(hit)
                            .addField('Base Reward', baseReward > 0 ? `$${baseReward}` : 'None', true)
                            .addField(`${rank.emoji} Total`, bonusReward > 0 ? `$${bonusReward}` : 'None', true)
                    ]
                });
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ Thou didst not shoot in time!', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'tarot') {
            if (!canPlayMiniGame(userId, 'tarot')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ The cards must rest! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const cards = [
                { name: 'The Fool', emoji: '🃏', reward: 80, msg: 'New beginnings await!' },
                { name: 'The Magician', emoji: '🎩', reward: 200, msg: 'Power and skill are thine!' },
                { name: 'Death', emoji: '💀', reward: -100, msg: 'Change comes at a cost!' },
                { name: 'Fortune', emoji: '🎰', reward: 350, msg: 'Lady Luck smiles upon thee!' },
                { name: 'The Tower', emoji: '🏰', reward: -50, msg: 'Chaos strikes thy coffers!' },
                { name: 'The Sun', emoji: '☀️', reward: 250, msg: 'Radiant fortune shines!' },
                { name: 'The Moon', emoji: '🌙', reward: 150, msg: 'Mystery brings reward!' }
            ];
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('card_1').setLabel('🂠').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('card_2').setLabel('🂠').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('card_3').setLabel('🂠').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('card_4').setLabel('🂠').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('card_5').setLabel('🂠').setStyle('PRIMARY')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#9b59b6')
                        .setTitle('🃏 Tarot Reading')
                        .setDescription('*The mystic lays out five cards...*\n\nChoose thy destiny!')
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                const card = cards[Math.floor(Math.random() * cards.length)];
                const baseReward = card.reward;
                const bonusReward = baseReward > 0 ? Math.floor(baseReward * (1 + rank.bonus)) : baseReward;
                
                await db.addBalance(guildId, userId, bonusReward);
                if (stats) await updateUserStats(guildId, userId, { 
                    total_earned: Math.max(0, bonusReward), 
                    mini_games_played: 1,
                    mini_games_won: bonusReward > 0 ? 1 : 0
                });
                recordMiniGamePlay(userId, 'tarot');
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor(bonusReward >= 0 ? '#43b581' : '#e74c3c')
                            .setTitle(`🃏 ${card.emoji} ${card.name}`)
                            .setDescription(`*${card.msg}*\n\n${bonusReward >= 0 ? 'Gained' : 'Lost'} **$${Math.abs(bonusReward)}**!`)
                            .addField('Base Fortune', `${baseReward >= 0 ? '+' : ''}$${baseReward}`, true)
                            .addField(`${rank.emoji} Result`, `${bonusReward >= 0 ? '+' : ''}$${bonusReward}`, true)
                    ],
                    components: []
                });
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The cards fade away...', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'quest') {
            if (!canPlayMiniGame(userId, 'quest')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Thou art weary from adventure! Rest until <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const quests = [
                { name: '🐉 Slay Dragon', danger: 'High', pay: 300, success: 0.5, emoji: '🐉' },
                { name: '⚔️ Clear Bandits', danger: 'Medium', pay: 200, success: 0.7, emoji: '⚔️' },
                { name: '🥖 Deliver Bread', danger: 'Low', pay: 100, success: 0.9, emoji: '🥖' }
            ];
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('quest_0').setLabel(`${quests[0].emoji} Dangerous`).setStyle('DANGER'),
                    new MessageButton().setCustomId('quest_1').setLabel(`${quests[1].emoji} Medium`).setStyle('PRIMARY'),
                    new MessageButton().setCustomId('quest_2').setLabel(`${quests[2].emoji} Easy`).setStyle('SUCCESS')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#3498db')
                        .setTitle('📜 Quest Board')
                        .setDescription('Choose thy quest wisely, adventurer!')
                        .addField('🐉 Slay Dragon', `Danger: **High**\nReward: $300\nSuccess: 50%`, true)
                        .addField('⚔️ Clear Bandits', `Danger: **Medium**\nReward: $200\nSuccess: 70%`, true)
                        .addField('🥖 Deliver Bread', `Danger: **Low**\nReward: $100\nSuccess: 90%`, true)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                const questIndex = parseInt(i.customId.split('_')[1]);
                const quest = quests[questIndex];
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle(`${quest.emoji} ${quest.name}`)
                            .setDescription('*Embarking on the quest...*')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const success = Math.random() < quest.success;
                if (success) {
                    const baseReward = quest.pay;
                    const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
                    await db.addBalance(guildId, userId, bonusReward);
                    if (stats) await updateUserStats(guildId, userId, { total_earned: bonusReward, mini_games_played: 1, mini_games_won: 1 });
                    recordMiniGamePlay(userId, 'quest');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#43b581')
                                .setTitle(`${quest.emoji} Quest Complete!`)
                                .setDescription(`Thou hast succeeded! The realm thanks thee!`)
                                .addField('Base Reward', `$${baseReward}`, true)
                                .addField(`${rank.emoji} Total`, `$${bonusReward}`, true)
                        ]
                    });
                } else {
                    const penalty = Math.floor(quest.pay * 0.3);
                    await db.addBalance(guildId, userId, -penalty);
                    if (stats) await updateUserStats(guildId, userId, { mini_games_played: 1 });
                    recordMiniGamePlay(userId, 'quest');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#e74c3c')
                                .setTitle(`${quest.emoji} Quest Failed!`)
                                .setDescription(`Thou wast defeated! Lost **$${penalty}** in supplies!`)
                        ]
                    });
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ Thou didst hesitate! The quests are taken by others.', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'liarsdice') {
            if (!canPlayMiniGame(userId, 'liarsdice')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ The tavern keeper says nay! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const { MessageEmbed } = require('discord.js');
            
            const roll1 = Math.floor(Math.random() * 6) + 1;
            const roll2 = Math.floor(Math.random() * 6) + 1;
            const playerTotal = roll1 + roll2;
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('dice_high').setLabel('📈 Wager High (8-12)').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('dice_low').setLabel('📉 Wager Low (2-6)').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('dice_seven').setLabel('🎯 Wager Seven').setStyle('SUCCESS')
                );
            
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle('🎲 Liar\'s Dice')
                        .setDescription('*The tavern keeper rolls two dice under a cup...*\n\n🍺 Make thy wager, traveler!')
                        .addField('High (8-12)', 'Pays 2x', true)
                        .addField('Lucky Seven', 'Pays 4x', true)
                        .addField('Low (2-6)', 'Pays 2x', true)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle('🎲 Rolling Dice...')
                            .setDescription('*The cup is lifted...*')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                let won = false;
                let multiplier = 0;
                let prediction = '';
                
                if (i.customId === 'dice_high') {
                    prediction = 'High (8-12)';
                    won = playerTotal >= 8 && playerTotal <= 12;
                    multiplier = 2;
                } else if (i.customId === 'dice_low') {
                    prediction = 'Low (2-6)';
                    won = playerTotal >= 2 && playerTotal <= 6;
                    multiplier = 2;
                } else if (i.customId === 'dice_seven') {
                    prediction = 'Lucky Seven';
                    won = playerTotal === 7;
                    multiplier = 4;
                }
                
                const baseBet = 100;
                const baseReward = won ? baseBet * multiplier : -baseBet;
                const bonusReward = baseReward > 0 ? Math.floor(baseReward * (1 + rank.bonus)) : baseReward;
                
                await db.addBalance(guildId, userId, bonusReward);
                if (stats) await updateUserStats(guildId, userId, { 
                    total_earned: Math.max(0, bonusReward), 
                    mini_games_played: 1,
                    mini_games_won: won ? 1 : 0
                });
                recordMiniGamePlay(userId, 'liarsdice');
                
                await i.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(won ? '#43b581' : '#e74c3c')
                            .setTitle('🎲 The Dice Reveal')
                            .setDescription(`**🎲 ${roll1} + ${roll2} = ${playerTotal}**\n\nThou wagered: **${prediction}**\n${won ? '✅ Victory!' : '❌ Defeat!'}`)
                            .addField('Result', won ? `Won $${bonusReward}!` : `Lost $${Math.abs(bonusReward)}`, true)
                            .addField(`${rank.emoji} Rank`, rank.bonus > 0 ? `+${Math.round(rank.bonus * 100)}% bonus` : 'No bonus', true)
                    ]
                });
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The tavern keeper takes back the dice!', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'smuggle') {
            if (!canPlayMiniGame(userId, 'smuggle')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ The gates are watched! Wait until <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const contraband = [
                { name: 'Wine', emoji: '🍷', reward: 150, penalty: 75, risk: 0.4 },
                { name: 'Weapons', emoji: '🗡️', reward: 300, penalty: 150, risk: 0.6 },
                { name: 'Secrets', emoji: '📜', reward: 250, penalty: 125, risk: 0.5 }
            ];
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('smuggle_0').setLabel('🍷 Wine').setStyle('SUCCESS'),
                    new MessageButton().setCustomId('smuggle_1').setLabel('🗡️ Weapons').setStyle('DANGER'),
                    new MessageButton().setCustomId('smuggle_2').setLabel('📜 Secrets').setStyle('PRIMARY')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#8e44ad')
                        .setTitle('🍷 Smuggling Operation')
                        .setDescription('*Thou approach the city gates with contraband...*\n\nWhat dost thou smuggle?')
                        .addField('🍷 Wine', 'Low Risk\n$150', true)
                        .addField('🗡️ Weapons', 'High Risk\n$300', true)
                        .addField('📜 Secrets', 'Medium Risk\n$250', true)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                const itemIndex = parseInt(i.customId.split('_')[1]);
                const item = contraband[itemIndex];
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle(`${item.emoji} Smuggling ${item.name}`)
                            .setDescription('🚶 Approaching the gate guards...')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const caught = Math.random() < item.risk;
                
                if (!caught) {
                    const baseReward = item.reward;
                    const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
                    await db.addBalance(guildId, userId, bonusReward);
                    if (stats) await updateUserStats(guildId, userId, { total_earned: bonusReward, mini_games_played: 1, mini_games_won: 1 });
                    recordMiniGamePlay(userId, 'smuggle');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#43b581')
                                .setTitle(`${item.emoji} Smuggling Success!`)
                                .setDescription(`The guards waved thee through! Sold ${item.name} for profit!`)
                                .addField('Base Profit', `$${baseReward}`, true)
                                .addField(`${rank.emoji} Total`, `$${bonusReward}`, true)
                        ]
                    });
                } else {
                    const penalty = item.penalty;
                    await db.addBalance(guildId, userId, -penalty);
                    if (stats) await updateUserStats(guildId, userId, { mini_games_played: 1 });
                    recordMiniGamePlay(userId, 'smuggle');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#e74c3c')
                                .setTitle('🛡️ Caught by Guards!')
                                .setDescription(`The guards discovered thy ${item.name}! Paid fine of **$${penalty}**!`)
                        ]
                    });
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ Thou fled before the guards noticed!', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'pickpocket') {
            if (!canPlayMiniGame(userId, 'pickpocket')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Lay low for now! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const targets = [
                { name: 'Wealthy Merchant', emoji: '👨‍💼', reward: 250, risk: 0.5 },
                { name: 'Noble Lady', emoji: '👸', reward: 300, risk: 0.6 },
                { name: 'Poor Peasant', emoji: '👨‍🌾', reward: 80, risk: 0.2 },
                { name: 'Drunk Knight', emoji: '🥴', reward: 200, risk: 0.4 }
            ];
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('pick_0').setLabel('👨‍💼 Merchant').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('pick_1').setLabel('👸 Noble').setStyle('DANGER'),
                    new MessageButton().setCustomId('pick_2').setLabel('👨‍🌾 Peasant').setStyle('SUCCESS'),
                    new MessageButton().setCustomId('pick_3').setLabel('🥴 Knight').setStyle('PRIMARY')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#34495e')
                        .setTitle('👛 Marketplace Pickpocketing')
                        .setDescription('*The marketplace bustles with activity...*\n\nWho shall be thy target?')
                        .addField('Risk vs Reward', 'Higher purses = more risk!', false)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                const targetIndex = parseInt(i.customId.split('_')[1]);
                const target = targets[targetIndex];
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle(`${target.emoji} Targeting ${target.name}`)
                            .setDescription('👥 Blending into the crowd...')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const caught = Math.random() < target.risk;
                
                if (!caught) {
                    const baseReward = target.reward;
                    const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
                    await db.addBalance(guildId, userId, bonusReward);
                    if (stats) await updateUserStats(guildId, userId, { total_earned: bonusReward, mini_games_played: 1, mini_games_won: 1 });
                    recordMiniGamePlay(userId, 'pickpocket');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#43b581')
                                .setTitle('👛 Clean Getaway!')
                                .setDescription(`Snatched the purse from ${target.name} unnoticed!`)
                                .addField('Stolen', `$${baseReward}`, true)
                                .addField(`${rank.emoji} Total`, `$${bonusReward}`, true)
                        ]
                    });
                } else {
                    const penalty = Math.floor(target.reward * 0.5);
                    await db.addBalance(guildId, userId, -penalty);
                    if (stats) await updateUserStats(guildId, userId, { mini_games_played: 1 });
                    recordMiniGamePlay(userId, 'pickpocket');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#e74c3c')
                                .setTitle('🚨 Caught Red-Handed!')
                                .setDescription(`${target.name} noticed thy thieving hand! Paid **$${penalty}** to avoid the stocks!`)
                        ]
                    });
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The crowd dispersed before thou could strike!', components: [], embeds: [] });
                }
            });
        } else if (commandName === 'bribe') {
            if (!canPlayMiniGame(userId, 'bribe')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ The guards remember thee! Wait until <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('bribe_50').setLabel('💰 Small ($50)').setStyle('SUCCESS'),
                    new MessageButton().setCustomId('bribe_100').setLabel('💰 Medium ($100)').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('bribe_200').setLabel('💰 Large ($200)').setStyle('DANGER')
                );
            
            const { MessageEmbed } = require('discord.js');
            const message = await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#f39c12')
                        .setTitle('💰 Bribe the Guards')
                        .setDescription('*A guard blocks thy path...*\n\n🛡️ "Halt! This area is restricted!"\n\nHow much coin dost thou offer?')
                        .addField('Small Bribe', '$50 - Low success', true)
                        .addField('Medium Bribe', '$100 - Fair chance', true)
                        .addField('Large Bribe', '$200 - High success', true)
                ],
                components: [row],
                fetchReply: true
            });
            
            const filter = i => i.user.id === userId;
            const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                const bribeAmount = parseInt(i.customId.split('_')[1]);
                const userBal = await db.getBalance(guildId, userId);
                
                if (userBal < bribeAmount) {
                    await i.update({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#e74c3c')
                                .setTitle('❌ Insufficient Funds')
                                .setDescription(`Thou dost not have $${bribeAmount} to offer!`)
                        ],
                        components: []
                    });
                    return;
                }
                
                await i.update({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#f39c12')
                            .setTitle('💰 Offering Bribe')
                            .setDescription('*Quietly sliding coin purse to the guard...*')
                    ],
                    components: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Success rates: $50=30%, $100=60%, $200=85%
                let successRate = 0.3;
                if (bribeAmount === 100) successRate = 0.6;
                if (bribeAmount === 200) successRate = 0.85;
                
                const accepted = Math.random() < successRate;
                
                if (accepted) {
                    // Return bribe + bonus
                    const baseReward = Math.floor(bribeAmount * 2.5);
                    const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
                    await db.addBalance(guildId, userId, bonusReward - bribeAmount);
                    if (stats) await updateUserStats(guildId, userId, { total_earned: bonusReward - bribeAmount, mini_games_played: 1, mini_games_won: 1 });
                    recordMiniGamePlay(userId, 'bribe');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#43b581')
                                .setTitle('🤝 Bribe Accepted!')
                                .setDescription(`The guard pockets thy coin and grants passage!\nHe also shares intel worth coin!`)
                                .addField('Bribe Cost', `-$${bribeAmount}`, true)
                                .addField('Intel Value', `+$${bonusReward}`, true)
                                .addField('Net Profit', `$${bonusReward - bribeAmount}`, true)
                        ]
                    });
                } else {
                    await db.addBalance(guildId, userId, -bribeAmount);
                    if (stats) await updateUserStats(guildId, userId, { mini_games_played: 1 });
                    recordMiniGamePlay(userId, 'bribe');
                    
                    await i.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#e74c3c')
                                .setTitle('🛡️ Bribe Rejected!')
                                .setDescription(`"How dare thee!" The guard confiscates thy **$${bribeAmount}** bribe!`)
                        ]
                    });
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ Thou walked away before bribing!', components: [], embeds: [] });
                }
            });
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
        
        // ============ RANK-LOCKED GAMES ============
        } else if (commandName === 'questboard') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            if (!canPlayGame(rank, 'questboard')) {
                await interaction.reply({ content: `🔒 Thou must be at least a **Knight** to access the quest board! (Need $5,000 total earned)`, ephemeral: true });
                return;
            }
            
            if (!canPlayMiniGame(userId, 'questboard')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Rest before more quests! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const simpleQuests = [
                { name: '🥖 Deliver Supplies', pay: 120, msg: 'Delivered bread to the barracks!' },
                { name: '🧹 Clean Stables', pay: 100, msg: 'Mucked out the royal stables!' },
                { name: '📦 Move Crates', pay: 110, msg: 'Loaded cargo at the docks!' },
                { name: '💌 Deliver Message', pay: 130, msg: 'Ran message between nobles!' }
            ];
            
            const quest = simpleQuests[Math.floor(Math.random() * simpleQuests.length)];
            const baseReward = quest.pay;
            const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
            
            await db.addBalance(guildId, userId, bonusReward);
            if (stats) await updateUserStats(guildId, userId, { total_earned: bonusReward, mini_games_played: 1, mini_games_won: 1 });
            recordMiniGamePlay(userId, 'questboard');
            
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#43b581')
                        .setTitle('📜 Quest Complete')
                        .setDescription(`${quest.name}\n\n*${quest.msg}*`)
                        .addField('Base Reward', `$${baseReward}`, true)
                        .addField(`${rank.emoji} Total`, `$${bonusReward}`, true)
                ]
            });
            
        } else if (commandName === 'taverndice') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            if (!canPlayGame(rank, 'taverndice')) {
                await interaction.reply({ content: `🔒 Thou must be a **Peasant** to play tavern dice!`, ephemeral: true });
                return;
            }
            
            if (!canPlayMiniGame(userId, 'taverndice')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ The dice are in use! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const roll1 = Math.floor(Math.random() * 6) + 1;
            const roll2 = Math.floor(Math.random() * 6) + 1;
            const total = roll1 + roll2;
            
            let baseReward = 0;
            let outcome = '';
            
            if (total === 12 || total === 2) {
                baseReward = 200;
                outcome = '🎰 **Snake Eyes or Boxcars!** Rare roll!';
            } else if (total === 7 || total === 11) {
                baseReward = 150;
                outcome = '🎲 **Lucky Seven or Eleven!**';
            } else if (total >= 8) {
                baseReward = 100;
                outcome = '✓ High roll! Small win.';
            } else {
                baseReward = 50;
                outcome = '📉 Low roll, small payout.';
            }
            
            const bonusReward = Math.floor(baseReward * (1 + rank.bonus));
            await db.addBalance(guildId, userId, bonusReward);
            if (stats) await updateUserStats(guildId, userId, { total_earned: bonusReward, mini_games_played: 1, mini_games_won: 1 });
            recordMiniGamePlay(userId, 'taverndice');
            
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle('🎲 Tavern Knucklebones')
                        .setDescription(`🎲 **${roll1}** + 🎲 **${roll2}** = **${total}**\n\n${outcome}`)
                        .addField('Base Winnings', `$${baseReward}`, true)
                        .addField(`${rank.emoji} Total`, `$${bonusReward}`, true)
                ]
            });
            
        } else if (commandName === 'duel') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            if (!canPlayGame(rank, 'duel')) {
                await interaction.reply({ content: `🔒 Thou must be at least a **Baron** to duel! (Need $15,000 total earned)`, ephemeral: true });
                return;
            }
            
            if (!canPlayMiniGame(userId, 'duel')) {
                const nextTime = nextAvailableMiniGame(userId);
                await interaction.reply({ content: `⏳ Thy sword arm needs rest! Return <t:${Math.floor(nextTime / 1000)}:R>`, ephemeral: true });
                return;
            }
            
            const opponent = interaction.options.getUser('opponent');
            const stakes = interaction.options.getInteger('stakes');
            
            if (opponent.id === userId) {
                await interaction.reply({ content: '⚔️ Thou cannot duel thyself!', ephemeral: true });
                return;
            }
            if (opponent.bot) {
                await interaction.reply({ content: '🤖 Bots do not accept duels!', ephemeral: true });
                return;
            }
            if (stakes < 50) {
                await interaction.reply({ content: '⚔️ Stakes must be at least $50!', ephemeral: true });
                return;
            }
            
            const userBal = await db.getBalance(guildId, userId);
            if (userBal < stakes) {
                await interaction.reply({ content: '💰 Thou dost not have enough coin!', ephemeral: true });
                return;
            }
            
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({
                content: `<@${opponent.id}>`,
                embeds: [
                    new MessageEmbed()
                        .setColor('#e74c3c')
                        .setTitle('⚔️ Duel Challenge!')
                        .setDescription(`<@${userId}> challenges <@${opponent.id}> to honorable combat!\n\n💰 Stakes: **$${stakes}**\n\n<@${opponent.id}>, use \`/duel\` to accept challenges! (Coming soon)`)
                ]
            });
            // Note: Full duel implementation would need accept/decline system
            // For now, simplified to NPC duel
            recordMiniGamePlay(userId, 'duel');
            
        } else if (commandName === 'joust') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats ? stats.total_earned : 0);
            
            if (!canPlayGame(rank, 'joust')) {
                await interaction.reply({ content: `🔒 Thou must be at least an **Earl** to joust! (Need $35,000 total earned)`, ephemeral: true });
                return;
            }
            
            const entryFee = 100;
            const userBal = await db.getBalance(guildId, userId);
            
            if (userBal < entryFee) {
                await interaction.reply({ content: `💰 Thou needst $${entryFee} to enter the tournament!`, ephemeral: true });
                return;
            }
            
            // Check if already entered today
            const today = new Date().toISOString().split('T')[0];
            const existingEntry = await db.query(
                'SELECT * FROM tournament_entries WHERE guild_id = $1 AND user_id = $2 AND entry_date = $3',
                [guildId, userId, today]
            );
            
            if (existingEntry.rows.length > 0) {
                await interaction.reply({ content: '🏇 Thou hast already entered today\'s tournament!', ephemeral: true });
                return;
            }
            
            // Enter tournament
            await db.addBalance(guildId, userId, -entryFee);
            await db.query(
                'INSERT INTO tournament_entries (guild_id, user_id, entry_date, entry_cost) VALUES ($1, $2, $3, $4)',
                [guildId, userId, today, entryFee]
            );
            
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#f39c12')
                        .setTitle('🏇 Jousting Tournament')
                        .setDescription(`Thou hast entered today's grand tournament!\n\n💰 Entry Fee: $${entryFee}\n🏆 Winners announced at day's end!\n\n*Tournament results coming soon...*`)
                ]
            });
            
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
        } else if (commandName === 'labor') {
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
