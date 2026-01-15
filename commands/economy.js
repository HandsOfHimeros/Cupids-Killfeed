// economy_backup.js restored content
const path = require('path');
const fs = require('fs');
const db = require('../database.js');
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed } = require('discord.js');
const COOLDOWN_FILE = path.join(__dirname, '../logs/economy_cooldowns.json');
const MINI_GAMES = ['fortuneteller','pillage','archery','tarot','quest','liarsdice','smuggle','pickpocket','bribe','labor','questboard','taverndice','duel','joust','hunting','fishing','mining','herbalism','blacksmith','alchemy','bard','horseracing','chess','relics','tournamentmelee','beasttaming','siegedefense','campaign'];
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
    { name: 'Peasant', emoji: '👨‍🌾', threshold: 0, bonus: 0, stipend: 0, games: ['labor', 'questboard', 'taverndice', 'fishing', 'herbalism'] },
    { name: 'Knight', emoji: '⚔️', threshold: 5000, bonus: 0.05, stipend: 0, games: ['archery', 'fortuneteller', 'hunting', 'mining'] },
    { name: 'Baron', emoji: '🛡️', threshold: 15000, bonus: 0.10, stipend: 0, games: ['duel', 'blacksmith', 'bard'] },
    { name: 'Earl', emoji: '🎖️', threshold: 35000, bonus: 0.15, stipend: 100, games: ['joust', 'alchemy', 'horseracing'] },
    { name: 'Duke', emoji: '👑', threshold: 75000, bonus: 0.20, stipend: 250, games: ['chess', 'relics', 'tournamentmelee'] },
    { name: 'King', emoji: '🏰', threshold: 150000, bonus: 0.25, stipend: 500, games: ['beasttaming', 'siegedefense'] }
];

// ============ ACHIEVEMENTS SYSTEM ============
const ACHIEVEMENTS = {
    first_win: { name: 'First Victory', emoji: '🎯', description: 'Win your first mini game', reward: 100 },
    games_10: { name: 'Adventurer', emoji: '🗺️', description: 'Play 10 mini games', reward: 250 },
    games_50: { name: 'Veteran', emoji: '⚔️', description: 'Play 50 mini games', reward: 500 },
    games_100: { name: 'Legend', emoji: '👑', description: 'Play 100 mini games', reward: 1000 },
    streak_7: { name: 'Dedicated', emoji: '🔥', description: '7 day login streak', reward: 500 },
    streak_30: { name: 'Devoted', emoji: '💎', description: '30 day login streak', reward: 2000 },
    reach_knight: { name: 'Knighted', emoji: '⚔️', description: 'Reach Knight rank', reward: 300 },
    reach_baron: { name: 'Noble Blood', emoji: '🛡️', description: 'Reach Baron rank', reward: 600 },
    reach_duke: { name: 'Royal Decree', emoji: '👑', description: 'Reach Duke rank', reward: 1500 },
    reach_king: { name: 'Long Live the King', emoji: '🏰', description: 'Reach King rank', reward: 3000 },
    rich_10k: { name: 'Wealthy', emoji: '💰', description: 'Have $10,000 in wallet', reward: 500 },
    rich_50k: { name: 'Tycoon', emoji: '💎', description: 'Have $50,000 in wallet', reward: 2000 },
    duel_win_5: { name: 'Duelist', emoji: '🗡️', description: 'Win 5 duels', reward: 750 },
    property_owner: { name: 'Landlord', emoji: '🏛️', description: 'Own a property', reward: 1000 }
};

// Daily login reward tiers (streak day → reward)
const DAILY_REWARDS = [
    { day: 1, reward: 50 },
    { day: 2, reward: 75 },
    { day: 3, reward: 100 },
    { day: 4, reward: 125 },
    { day: 5, reward: 150 },
    { day: 6, reward: 200 },
    { day: 7, reward: 500 },
    { day: 14, reward: 1000 },
    { day: 30, reward: 3000 }
];

// Story campaigns with chapters
const CAMPAIGNS = {
    dragon_quest: {
        id: 'dragon_quest',
        name: '🐉 The Dragon\'s Curse',
        description: 'A dragon threatens the kingdom. Can thou save the realm?',
        chapters: [
            {
                num: 1,
                title: 'The Village in Peril',
                story: 'A great dragon has awakened in the mountains, burning villages and stealing livestock. The King summons thee to his throne room.',
                choices: [
                    { id: 'accept', label: '⚔️ Accept the Quest', chance: 0.7, reward: 500, nextChapter: 2 },
                    { id: 'refuse', label: '🚪 Decline', chance: 1.0, reward: 0, nextChapter: null, ending: 'Thou fled like a coward. The dragon consumed the kingdom.' }
                ]
            },
            {
                num: 2,
                title: 'Journey to the Mountains',
                story: 'Thou travelest north through treacherous terrain. In the mountain pass, bandits block thy path!',
                choices: [
                    { id: 'fight', label: '⚔️ Fight the Bandits', chance: 0.65, reward: 750, nextChapter: 3 },
                    { id: 'bribe', label: '💰 Bribe Them', chance: 0.85, reward: 400, nextChapter: 3, cost: 200 },
                    { id: 'sneak', label: '🌙 Sneak Past', chance: 0.50, reward: 900, nextChapter: 3 }
                ]
            },
            {
                num: 3,
                title: 'The Dragon\'s Lair',
                story: 'Thou hast reached the smoldering cave. The dragon awaits within, guarding mountains of gold!',
                choices: [
                    { id: 'slay', label: '⚔️ Slay the Dragon', chance: 0.45, reward: 2000, nextChapter: null, ending: '🏆 VICTORY! Thou slew the dragon and saved the kingdom!' },
                    { id: 'negotiate', label: '🗣️ Negotiate', chance: 0.70, reward: 1200, nextChapter: null, ending: '🤝 The dragon agreed to leave. Peace returns to the realm.' },
                    { id: 'steal', label: '💎 Steal Treasure', chance: 0.30, reward: 3000, nextChapter: null, ending: '💰 Thou stole riches but the dragon still terrorizes the land...' }
                ]
            }
        ]
    },
    witch_forest: {
        id: 'witch_forest',
        name: '🧙‍♀️ The Witch of Darkwood',
        description: 'Strange magic corrupts the forest. Uncover the mystery.',
        chapters: [
            {
                num: 1,
                title: 'The Cursed Forest',
                story: 'Animals flee Darkwood Forest. Trees wither. Villagers speak of a witch\'s curse.',
                choices: [
                    { id: 'investigate', label: '🔍 Investigate', chance: 0.75, reward: 400, nextChapter: 2 },
                    { id: 'ignore', label: '🏠 Ignore It', chance: 1.0, reward: 0, nextChapter: null, ending: 'The curse spread. The forest consumed the village.' }
                ]
            },
            {
                num: 2,
                title: 'The Witch\'s Cabin',
                story: 'Deep in the woods, thou findest a decrepit cabin. Smoke rises from the chimney. A crone peers through the window.',
                choices: [
                    { id: 'knock', label: '🚪 Knock Politely', chance: 0.80, reward: 800, nextChapter: 3 },
                    { id: 'break_in', label: '💥 Break In', chance: 0.50, reward: 1100, nextChapter: 3 },
                    { id: 'spy', label: '👁️ Spy Through Window', chance: 0.65, reward: 650, nextChapter: 3 }
                ]
            },
            {
                num: 3,
                title: 'The Witch\'s Secret',
                story: 'The "witch" is actually the forest guardian, wounded by poachers. She cursed the land in pain.',
                choices: [
                    { id: 'heal', label: '💚 Heal Her Wounds', chance: 0.85, reward: 1800, nextChapter: null, ending: '🌳 The curse lifted! The forest blooms anew. The guardian blessed thee!' },
                    { id: 'capture', label: '⛓️ Capture Her', chance: 0.60, reward: 1000, nextChapter: null, ending: '💔 Thou captured the guardian. The forest died forever.' },
                    { id: 'hunt_poachers', label: '🏹 Hunt the Poachers', chance: 0.55, reward: 2200, nextChapter: null, ending: '⚖️ Justice served! The poachers were punished. The forest recovers!' }
                ]
            }
        ]
    }
};

// Random events that can trigger for active players
const RANDOM_EVENTS = [
    {
        id: 'treasure_found',
        name: '💰 Treasure Found!',
        description: 'Whilst walking, thou stumbled upon a hidden cache of coins!',
        chance: 0.15,
        minReward: 200,
        maxReward: 800,
        type: 'positive'
    },
    {
        id: 'royal_favor',
        name: '👑 Royal Favor',
        description: 'The King noticed thy deeds and grants thee a royal reward!',
        chance: 0.08,
        minReward: 500,
        maxReward: 1500,
        type: 'positive'
    },
    {
        id: 'lucky_streak',
        name: '🌟 Lucky Day',
        description: 'The stars align in thy favor! Thy next game rewards are doubled!',
        chance: 0.10,
        duration: 1, // 1 game
        type: 'buff'
    },
    {
        id: 'mysterious_gift',
        name: '🎁 Mysterious Gift',
        description: 'A mysterious stranger left a gift for thee!',
        chance: 0.12,
        materials: true,
        type: 'positive'
    },
    {
        id: 'tax_collector',
        name: '💸 Tax Collector',
        description: 'The tax collector demands his due!',
        chance: 0.10,
        taxRate: 0.05, // 5% of wallet
        minTax: 50,
        maxTax: 500,
        type: 'negative'
    },
    {
        id: 'bandit_attack',
        name: '🗡️ Bandit Attack',
        description: 'Bandits ambush thee on the road!',
        chance: 0.08,
        canDefend: true,
        defendChance: 0.60,
        loseAmount: 300,
        type: 'negative'
    },
    {
        id: 'festival',
        name: '🎪 Festival Day',
        description: 'A grand festival begins! All game rewards increased for 2 hours!',
        chance: 0.05,
        multiplier: 1.5,
        duration: 7200000, // 2 hours in ms
        type: 'guild_buff'
    },
    {
        id: 'rare_material',
        name: '💎 Rare Discovery',
        description: 'Thou found a cache of rare crafting materials!',
        chance: 0.10,
        materials: { gold_ore: 3, silver_ore: 2, gem: 1 },
        type: 'positive'
    },
    {
        id: 'noble_visitor',
        name: '🏰 Noble Visitor',
        description: 'A noble from afar heard of thy achievements and rewards thee!',
        chance: 0.07,
        achievementBonus: true,
        minReward: 400,
        maxReward: 1200,
        type: 'positive'
    }
];

// Track active buffs per user
const activeBuffs = new Map(); // userId -> { type, expiresAt }
const guildBuffs = new Map(); // guildId -> { type, multiplier, expiresAt }

function getDailyReward(streak) {
    // Find the highest reward tier for this streak
    let reward = 50; // Base reward
    for (const tier of DAILY_REWARDS) {
        if (streak >= tier.day) reward = tier.reward;
    }
    return reward;
}

async function checkAndAwardAchievements(guildId, userId, stats, balance) {
    const newAchievements = [];
    
    // Check game-based achievements
    if (stats.mini_games_won >= 1 && !(await db.hasAchievement(guildId, userId, 'first_win'))) {
        await db.unlockAchievement(guildId, userId, 'first_win');
        newAchievements.push('first_win');
    }
    if (stats.mini_games_played >= 10 && !(await db.hasAchievement(guildId, userId, 'games_10'))) {
        await db.unlockAchievement(guildId, userId, 'games_10');
        newAchievements.push('games_10');
    }
    if (stats.mini_games_played >= 50 && !(await db.hasAchievement(guildId, userId, 'games_50'))) {
        await db.unlockAchievement(guildId, userId, 'games_50');
        newAchievements.push('games_50');
    }
    if (stats.mini_games_played >= 100 && !(await db.hasAchievement(guildId, userId, 'games_100'))) {
        await db.unlockAchievement(guildId, userId, 'games_100');
        newAchievements.push('games_100');
    }
    
    // Check rank achievements
    const rank = getRank(stats.total_earned);
    if (rank.name === 'Knight' && !(await db.hasAchievement(guildId, userId, 'reach_knight'))) {
        await db.unlockAchievement(guildId, userId, 'reach_knight');
        newAchievements.push('reach_knight');
    }
    if (rank.name === 'Baron' && !(await db.hasAchievement(guildId, userId, 'reach_baron'))) {
        await db.unlockAchievement(guildId, userId, 'reach_baron');
        newAchievements.push('reach_baron');
    }
    if (rank.name === 'Duke' && !(await db.hasAchievement(guildId, userId, 'reach_duke'))) {
        await db.unlockAchievement(guildId, userId, 'reach_duke');
        newAchievements.push('reach_duke');
    }
    if (rank.name === 'King' && !(await db.hasAchievement(guildId, userId, 'reach_king'))) {
        await db.unlockAchievement(guildId, userId, 'reach_king');
        newAchievements.push('reach_king');
    }
    
    // Check wealth achievements
    if (balance >= 10000 && !(await db.hasAchievement(guildId, userId, 'rich_10k'))) {
        await db.unlockAchievement(guildId, userId, 'rich_10k');
        newAchievements.push('rich_10k');
    }
    if (balance >= 50000 && !(await db.hasAchievement(guildId, userId, 'rich_50k'))) {
        await db.unlockAchievement(guildId, userId, 'rich_50k');
        newAchievements.push('rich_50k');
    }
    
    // Award achievement rewards
    let totalReward = 0;
    for (const achievementId of newAchievements) {
        totalReward += ACHIEVEMENTS[achievementId].reward;
    }
    
    if (totalReward > 0) {
        await db.addBalance(guildId, userId, totalReward);
    }
    
    return { newAchievements, totalReward };
}

// Trigger random event for a user
async function triggerRandomEvent(interaction, guildId, userId) {
    const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
    
    // 15% chance overall for any event to trigger
    if (Math.random() > 0.15) return null;
    
    // Pick a random event
    const availableEvents = RANDOM_EVENTS.filter(e => Math.random() < e.chance);
    if (availableEvents.length === 0) return null;
    
    const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    
    try {
        if (event.type === 'positive') {
            if (event.materials && event.materials !== true) {
                // Give specific materials
                for (const [material, qty] of Object.entries(event.materials)) {
                    await db.addInventoryItem(guildId, userId, material, qty);
                }
                await interaction.followUp({
                    embeds: [new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle(event.name)
                        .setDescription(`${event.description}\n\n🎒 Received: ${Object.entries(event.materials).map(([m, q]) => `${q}x ${m.replace('_', ' ')}`).join(', ')}`)],
                    ephemeral: false
                });
            } else if (event.materials === true) {
                // Random materials
                const materials = ['gold_ore', 'silver_ore', 'gem'];
                const material = materials[Math.floor(Math.random() * materials.length)];
                const qty = Math.floor(Math.random() * 3) + 1;
                await db.addInventoryItem(guildId, userId, material, qty);
                await interaction.followUp({
                    embeds: [new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle(event.name)
                        .setDescription(`${event.description}\n\n🎒 Received: ${qty}x ${material.replace('_', ' ')}`)],
                    ephemeral: false
                });
            } else {
                // Give money
                const reward = Math.floor(Math.random() * (event.maxReward - event.minReward + 1)) + event.minReward;
                await db.addBalance(guildId, userId, reward);
                await interaction.followUp({
                    embeds: [new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle(event.name)
                        .setDescription(`${event.description}\n\n💰 Gained: $${reward}`)],
                    ephemeral: false
                });
            }
        } else if (event.type === 'buff') {
            // Apply personal buff
            activeBuffs.set(userId, { type: event.id, uses: event.duration, multiplier: 2.0 });
            await interaction.followUp({
                embeds: [new MessageEmbed()
                    .setColor('#ffd700')
                    .setTitle(event.name)
                    .setDescription(`${event.description}\n\n✨ Active for ${event.duration} game(s)!`)],
                ephemeral: false
            });
        } else if (event.type === 'negative') {
            if (event.id === 'tax_collector') {
                const balance = await db.getBalance(guildId, userId);
                const tax = Math.min(Math.max(Math.floor(balance * event.taxRate), event.minTax), event.maxTax);
                if (balance >= tax) {
                    await db.subtractBalance(guildId, userId, tax);
                    await interaction.followUp({
                        embeds: [new MessageEmbed()
                            .setColor('#ff6600')
                            .setTitle(event.name)
                            .setDescription(`${event.description}\n\n💸 Lost: $${tax}`)],
                        ephemeral: false
                    });
                }
            } else if (event.id === 'bandit_attack') {
                const row = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(`defend_${userId}`).setLabel('⚔️ Defend').setStyle('DANGER'),
                    new MessageButton().setCustomId(`flee_${userId}`).setLabel('🏃 Flee').setStyle('SECONDARY')
                );
                
                await interaction.followUp({
                    embeds: [new MessageEmbed()
                        .setColor('#ff0000')
                        .setTitle(event.name)
                        .setDescription(`${event.description}\n\nQuick! Defend thyself or flee!`)],
                    components: [row],
                    ephemeral: false
                });
                
                // Handle in separate collector
                const filter = i => i.user.id === userId;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000, max: 1 });
                
                collector.on('collect', async i => {
                    if (i.customId === `defend_${userId}`) {
                        const success = Math.random() < event.defendChance;
                        if (success) {
                            await i.update({
                                embeds: [new MessageEmbed()
                                    .setColor('#00ff00')
                                    .setTitle('⚔️ Victory!')
                                    .setDescription('Thou fought off the bandits! Thy coins are safe!')],
                                components: []
                            });
                        } else {
                            await db.subtractBalance(guildId, userId, event.loseAmount);
                            await i.update({
                                embeds: [new MessageEmbed()
                                    .setColor('#ff0000')
                                    .setTitle('💀 Defeated!')
                                    .setDescription(`The bandits overpowered thee!\n\n💸 Lost: $${event.loseAmount}`)],
                                components: []
                            });
                        }
                    } else {
                        const fleeLoss = Math.floor(event.loseAmount * 0.5);
                        await db.subtractBalance(guildId, userId, fleeLoss);
                        await i.update({
                            embeds: [new MessageEmbed()
                                .setColor('#ffaa00')
                                .setTitle('🏃 Escaped!')
                                .setDescription(`Thou fled! The bandits took some coins as thou ran.\n\n💸 Lost: $${fleeLoss}`)],
                            components: []
                        });
                    }
                });
                
                collector.on('end', collected => {
                    if (collected.size === 0) {
                        db.subtractBalance(guildId, userId, event.loseAmount);
                        interaction.followUp({
                            embeds: [new MessageEmbed()
                                .setColor('#ff0000')
                                .setTitle('💸 Robbed!')
                                .setDescription(`Thou froze in fear! The bandits took thy coins.\n\n💸 Lost: $${event.loseAmount}`)],
                            ephemeral: false
                        });
                    }
                });
            }
        } else if (event.type === 'guild_buff') {
            // Apply guild-wide buff
            guildBuffs.set(guildId, {
                type: event.id,
                multiplier: event.multiplier,
                expiresAt: Date.now() + event.duration
            });
            
            await interaction.followUp({
                embeds: [new MessageEmbed()
                    .setColor('#ff00ff')
                    .setTitle(event.name)
                    .setDescription(`${event.description}\n\n🎉 All players benefit! @everyone`)],
                ephemeral: false
            });
        }
        
        return event;
    } catch (error) {
        console.error('[RANDOM_EVENT] Error triggering event:', error);
        return null;
    }
}

// Check and apply active buffs to rewards
function applyBuffs(guildId, userId, baseReward) {
    let reward = baseReward;
    
    // Check personal buff
    if (activeBuffs.has(userId)) {
        const buff = activeBuffs.get(userId);
        reward *= buff.multiplier;
        buff.uses--;
        if (buff.uses <= 0) {
            activeBuffs.delete(userId);
        }
    }
    
    // Check guild buff
    if (guildBuffs.has(guildId)) {
        const buff = guildBuffs.get(guildId);
        if (Date.now() < buff.expiresAt) {
            reward *= buff.multiplier;
        } else {
            guildBuffs.delete(guildId);
        }
    }
    
    return Math.floor(reward);
}

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
        
        // Track weekly earnings if total_earned was updated
        if (updates.total_earned) {
            await db.addWeeklyEarnings(guildId, userId, updates.total_earned);
        }
    } catch (err) {
        console.error('[RANK] Error updating user stats:', err);
    }
}

// Helper to update stats after game completion and check achievements
async function completeGame(guildId, userId, earned, won) {
    await updateUserStats(guildId, userId, {
        total_earned: earned,
        mini_games_played: 1,
        mini_games_won: won ? 1 : 0
    });
    
    // Check achievements
    const stats = await getUserStats(guildId, userId);
    const balance = await db.getBalance(guildId, userId);
    return await checkAndAwardAchievements(guildId, userId, stats, balance);
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
            .setDescription('View and purchase items from the shop'),
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
        new SlashCommandBuilder()
            .setName('hunting')
            .setDescription('🏹 Hunt wild game in the royal forest - Deer, boar, or rabbits?'),
        new SlashCommandBuilder()
            .setName('fishing')
            .setDescription('🎣 Cast thy nets in the river - Catch salmon, trout, or eels!'),
        new SlashCommandBuilder()
            .setName('mining')
            .setDescription('⛏️ Mine in the mountains - Dig for gold, silver, or gems!'),
        new SlashCommandBuilder()
            .setName('herbalism')
            .setDescription('🌿 Gather herbs from the forest - Find healing plants or rare poisons!'),
        new SlashCommandBuilder()
            .setName('blacksmith')
            .setDescription('🔨 Forge weapons and armor - Craft crude, fine, or masterwork quality!'),
        new SlashCommandBuilder()
            .setName('alchemy')
            .setDescription('⚗️ Mix potions in thy laboratory - Create elixirs or risk explosions!'),
        new SlashCommandBuilder()
            .setName('bard')
            .setDescription('🎵 Perform in the tavern - Play songs and earn tips from patrons!'),
        new SlashCommandBuilder()
            .setName('horseracing')
            .setDescription('🐴 Race thy steed at the tracks - Bet on speed or stamina!'),
        new SlashCommandBuilder()
            .setName('chess')
            .setDescription('♟️ Play strategic chess match - Outwit thy noble opponent!'),
        new SlashCommandBuilder()
            .setName('relics')
            .setDescription('🏛️ Hunt ancient relics in ruins - Discover treasures or traps!'),
        new SlashCommandBuilder()
            .setName('tournamentmelee')
            .setDescription('⚔️ Enter the grand melee tournament - Group combat for glory!'),
        new SlashCommandBuilder()
            .setName('beasttaming')
            .setDescription('🐻 Attempt to tame wild beasts - Bears, wolves, or eagles!'),
        new SlashCommandBuilder()
            .setName('siegedefense')
            .setDescription('🏰 Defend castle walls from attackers - Command thy defenders!'),
        new SlashCommandBuilder()
            .setName('daily')
            .setDescription('🎁 Claim thy daily login reward - Streaks earn more!'),
        new SlashCommandBuilder()
            .setName('achievements')
            .setDescription('🏆 View thy unlocked achievements and badges'),
        new SlashCommandBuilder()
            .setName('gift')
            .setDescription('💝 Gift coin to another player')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Player to gift coin to')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Amount to gift (min $50)')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('properties')
            .setDescription('🏛️ View and manage thy properties'),
        new SlashCommandBuilder()
            .setName('buyproperty')
            .setDescription('🏰 Purchase property for passive income')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Type of property')
                    .setRequired(true)
                    .addChoices(
                        { name: '🍺 Tavern ($10,000 - $50/day)', value: 'tavern' },
                        { name: '⚒️ Blacksmith Shop ($20,000 - $125/day)', value: 'blacksmith_shop' },
                        { name: '🏛️ Trading Post ($35,000 - $250/day)', value: 'trading_post' },
                        { name: '🏰 Castle ($100,000 - $1,000/day)', value: 'castle' }
                    )),
        new SlashCommandBuilder()
            .setName('inventory')
            .setDescription('🎒 View thy crafting materials and items'),
        new SlashCommandBuilder()
            .setName('weeklyleaderboard')
            .setDescription('📊 View this week\'s top earners'),
        new SlashCommandBuilder()
            .setName('campaign')
            .setDescription('📖 Embark on story-driven quests and adventures'),
    ],
    async execute(interaction) {
        console.log(`[ECONOMY] execute called for command: ${interaction.commandName}, channel: ${interaction.channelId}`);
        const { commandName } = interaction;
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const { MessageEmbed } = require('discord.js');
        
        // Get guild config for channel IDs
        const guildConfig = await db.getGuildConfig(guildId);
        const DEV_MODE = process.env.DEV_MODE === 'true';
        
        if (!guildConfig && !DEV_MODE) {
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
        
        const SHOP_CHANNEL_ID = guildConfig?.shop_channel_id;
        const ECONOMY_CHANNEL_ID = guildConfig?.economy_channel_id;
        
        if (interaction.commandName === 'shop') {
            console.log('[SHOP] Entered /shop logic');
            try {
                console.log('[SHOP] Channel check');
                if (!DEV_MODE && interaction.channelId !== SHOP_CHANNEL_ID) {
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
                
                // Helper function to group items by category
                function getCategorizedItems() {
                    const categories = {
                        'ASSAULT_SMG': { name: 'Assault Rifles & SMGs', emoji: '🔫', items: [] },
                        'SNIPER_MARKSMAN': { name: 'Sniper & Marksman Rifles', emoji: '🎯', items: [] },
                        'RIFLES_SHOTGUNS': { name: 'Rifles & Shotguns', emoji: '🏹', items: [] },
                        'PISTOLS': { name: 'Pistols & Sidearms', emoji: '🔫', items: [] },
                        'MELEE': { name: 'Melee Weapons', emoji: '🔪', items: [] },
                        'ATTACHMENTS': { name: 'Weapon Attachments', emoji: '🔭', items: [] },
                        'AMMUNITION': { name: 'Ammunition', emoji: '📦', items: [] },
                        'MEDICAL': { name: 'Medical Supplies', emoji: '💉', items: [] },
                        'FOOD_DRINK': { name: 'Food & Drink', emoji: '🍖', items: [] },
                        'TOOLS': { name: 'Tools & Repair', emoji: '🔧', items: [] },
                        'CLOTHING_ARMOR': { name: 'Clothing & Armor', emoji: '👕', items: [] },
                        'BACKPACKS': { name: 'Backpacks & Storage', emoji: '🎒', items: [] },
                        'BUILDING': { name: 'Base Building', emoji: '🏗️', items: [] },
                        'VEHICLE': { name: 'Vehicle Parts', emoji: '🚗', items: [] },
                        'ELECTRONICS': { name: 'Explosives & Electronics', emoji: '💣', items: [] }
                    };
                    
                    // Assign items by index ranges (based on shop_items.js structure)
                    // This is more reliable than parsing comments
                    const ranges = {
                        'ASSAULT_SMG': [0, 23],           // Indices 0-22: Assault rifles & SMGs
                        'SNIPER_MARKSMAN': [23, 40],      // Indices 23-39: Sniper & marksman rifles
                        'RIFLES_SHOTGUNS': [40, 49],      // Indices 40-48: Rifles & shotguns
                        'PISTOLS': [49, 63],              // Indices 49-62: Pistols
                        'MELEE': [63, 83],                // Indices 63-82: Melee weapons
                        'ATTACHMENTS': [83, 159],         // Indices 83-158: Attachments + Magazines
                        'AMMUNITION': [159, 178],         // Indices 159-177: Ammunition
                        'MEDICAL': [178, 195],            // Indices 178-194: Medical
                        'FOOD_DRINK': [195, 223],         // Indices 195-222: Food & drink
                        'TOOLS': [223, 241],              // Indices 223-240: Tools & repair
                        'CLOTHING_ARMOR': [241, 289],     // Indices 241-288: Clothing & armor
                        'BACKPACKS': [289, 315],          // Indices 289-314: Backpacks & storage
                        'BUILDING': [315, 327],           // Indices 315-326: Building materials
                        'VEHICLE': [327, 339],            // Indices 327-338: Vehicle parts
                        'ELECTRONICS': [339, 362]         // Indices 339-361: Electronics & grenades
                    };
                    
                    for (const [categoryKey, [start, end]] of Object.entries(ranges)) {
                        categories[categoryKey].items = shopItems.slice(start, end);
                    }
                    
                    return categories;
                }
                
                console.log('[SHOP] Showing category browser');
                    
                    // Shopping cart storage (per user session)
                    const shoppingCart = new Map();
                    
                    // Show category selection
                    const row1 = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('cat_assault_smg')
                                .setLabel('🔫 Assault/SMG')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_sniper')
                                .setLabel('🎯 Sniper')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_rifles')
                                .setLabel('🏹 Rifles/Shotguns')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_pistols')
                                .setLabel('🔫 Pistols')
                                .setStyle('PRIMARY')
                        );
                    
                    const row2 = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('cat_melee')
                                .setLabel('🔪 Melee')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_attachments')
                                .setLabel('🔭 Attachments')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_ammo')
                                .setLabel('📦 Ammunition')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_medical')
                                .setLabel('💉 Medical')
                                .setStyle('PRIMARY')
                        );
                    
                    const row3 = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('cat_food')
                                .setLabel('🍖 Food/Drink')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_tools')
                                .setLabel('🔧 Tools')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_clothing')
                                .setLabel('👕 Clothing/Armor')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_backpacks')
                                .setLabel('🎒 Backpacks')
                                .setStyle('PRIMARY')
                        );
                    
                    const row4 = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('cat_building')
                                .setLabel('🏗️ Building')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_vehicle')
                                .setLabel('🚗 Vehicle')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('cat_electronics')
                                .setLabel('💣 Electronics')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('view_cart')
                                .setLabel('🛒 View Cart (0)')
                                .setStyle('SUCCESS')
                        );
                    
                    const message = await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor('#ff69b4')
                                .setTitle('🛒 DayZ Shop - Select a Category')
                                .setDescription('Browse items by category. Click a button below to view items.')
                        ],
                        components: [row1, row2, row3, row4],
                        fetchReply: true
                    });
                    
                    // Create unified collector for all interactions (buttons and select menus)
                    const filter = i => i.user.id === interaction.user.id;
                    const collector = message.createMessageComponentCollector({ 
                        filter,
                        time: 600000 
                    }); // 10 minutes
                    
                    const categories = getCategorizedItems();
                    let currentCategory = null;
                    let currentPage = 0;
                    const ITEMS_PER_PAGE = 10;
                    
                    // Helper to update cart button
                    function updateCartButton(components) {
                        const cartSize = Array.from(shoppingCart.values()).reduce((sum, qty) => sum + qty, 0);
                        const row4Updated = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId('cat_building')
                                    .setLabel('🏗️ Building')
                                    .setStyle('PRIMARY'),
                                new MessageButton()
                                    .setCustomId('cat_vehicle')
                                    .setLabel('🚗 Vehicle')
                                    .setStyle('PRIMARY'),
                                new MessageButton()
                                    .setCustomId('cat_electronics')
                                    .setLabel('💣 Electronics')
                                    .setStyle('PRIMARY'),
                                new MessageButton()
                                    .setCustomId('view_cart')
                                    .setLabel(`🛒 View Cart (${cartSize})`)
                                    .setStyle('SUCCESS')
                            );
                        return [row1, row2, row3, row4Updated];
                    }
                    
                    collector.on('collect', async i => {
                        console.log(`[SHOP-COLLECTOR] Received: ${i.customId}, isSelectMenu: ${i.isSelectMenu()}, user: ${i.user.tag}`);
                        try {
                            // Handle SELECT MENU (item selection)
                            if (i.isSelectMenu() && i.customId === 'select_item') {
                                console.log(`[SHOP] SELECT MENU detected, value: ${i.values[0]}`);
                                const itemIdx = parseInt(i.values[0].split('_')[1]);
                                const item = shopItems[itemIdx];
                                
                                // Show quantity selection
                                const qtyRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageButton()
                                            .setCustomId(`qty_${itemIdx}_1`)
                                            .setLabel('1x')
                                            .setStyle('SECONDARY'),
                                        new MessageButton()
                                            .setCustomId(`qty_${itemIdx}_2`)
                                            .setLabel('2x')
                                            .setStyle('SECONDARY'),
                                        new MessageButton()
                                            .setCustomId(`qty_${itemIdx}_3`)
                                            .setLabel('3x')
                                            .setStyle('SECONDARY'),
                                        new MessageButton()
                                            .setCustomId(`qty_${itemIdx}_5`)
                                            .setLabel('5x')
                                            .setStyle('SECONDARY')
                                    );
                                
                                const qtyMessage = await i.reply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle(`Add ${item.name} to Cart`)
                                            .setDescription(`**Price:** $${item.averagePrice} each\n\n${item.description}\n\nSelect quantity:`)
                                    ],
                                    components: [qtyRow],
                                    ephemeral: true,
                                    fetchReply: true
                                });
                                
                                // Create a collector for THIS ephemeral message
                                const qtyCollector = qtyMessage.createMessageComponentCollector({
                                    time: 60000 // 1 minute to select quantity
                                });
                                
                                qtyCollector.on('collect', async qtyInteraction => {
                                    console.log(`[QTY-COLLECTOR] Received: ${qtyInteraction.customId}`);
                                    if (qtyInteraction.customId.startsWith('qty_')) {
                                        const parts = qtyInteraction.customId.split('_');
                                        const qtyItemIdx = parseInt(parts[1]);
                                        const qty = parseInt(parts[2]);
                                        const qtyItem = shopItems[qtyItemIdx];
                                        
                                        const existing = shoppingCart.get(qtyItemIdx) || 0;
                                        shoppingCart.set(qtyItemIdx, existing + qty);
                                        
                                        console.log(`[SHOP] Adding ${qty}x ${qtyItem.name} to cart. Total now: ${shoppingCart.get(qtyItemIdx)}`);
                                        
                                        await qtyInteraction.update({
                                            embeds: [
                                                new MessageEmbed()
                                                    .setColor('#00ff00')
                                                    .setTitle('✅ Added to Cart')
                                                    .setDescription(`Added ${qty}x **${qtyItem.name}** to your cart!\n\nTotal in cart: ${shoppingCart.get(qtyItemIdx)}x`)
                                            ],
                                            components: []
                                        });
                                        
                                        console.log(`[SHOP] Ephemeral message updated, now updating main message cart button...`);
                                        // Update main message cart button
                                        await message.edit({ components: updateCartButton() }).catch(err => {
                                            console.error(`[SHOP] Failed to update cart button:`, err);
                                        });
                                        console.log(`[SHOP] Cart button updated successfully`);
                                        qtyCollector.stop();
                                    }
                                });
                                
                                return;
                            }
                            
                            // Handle category selection
                            const categoryButtonMap = {
                                'cat_assault_smg': 'ASSAULT_SMG',
                                'cat_sniper': 'SNIPER_MARKSMAN',
                                'cat_rifles': 'RIFLES_SHOTGUNS',
                                'cat_pistols': 'PISTOLS',
                                'cat_melee': 'MELEE',
                                'cat_attachments': 'ATTACHMENTS',
                                'cat_ammo': 'AMMUNITION',
                                'cat_medical': 'MEDICAL',
                                'cat_food': 'FOOD_DRINK',
                                'cat_tools': 'TOOLS',
                                'cat_clothing': 'CLOTHING_ARMOR',
                                'cat_backpacks': 'BACKPACKS',
                                'cat_building': 'BUILDING',
                                'cat_vehicle': 'VEHICLE',
                                'cat_electronics': 'ELECTRONICS'
                            };
                            
                            if (categoryButtonMap[i.customId]) {
                                const categoryKey = categoryButtonMap[i.customId];
                                currentCategory = categoryKey;
                                currentPage = 0;
                                const category = categories[categoryKey];
                                const items = category.items;
                                
                                if (items.length === 0) {
                                    await i.reply({ content: 'No items in this category yet!', ephemeral: true });
                                    return;
                                }
                                
                                // Show items with Select menus for adding to cart
                                const startIdx = currentPage * ITEMS_PER_PAGE;
                                const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, items.length);
                                const pageItems = items.slice(startIdx, endIdx);
                                
                                let desc = `**Page ${currentPage + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}**\n\n`;
                                const selectOptions = [];
                                
                                for (let idx = 0; idx < pageItems.length; idx++) {
                                    const item = pageItems[idx];
                                    const globalIdx = startIdx + idx;
                                    desc += `${idx + 1}. **${item.name}** — $${item.averagePrice}\n   ${item.description || 'No description'}\n\n`;
                                    
                                    selectOptions.push({
                                        label: item.name.substring(0, 100),
                                        description: `$${item.averagePrice}`,
                                        value: `item_${globalIdx}`
                                    });
                                }
                                
                                const selectRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageSelectMenu()
                                            .setCustomId('select_item')
                                            .setPlaceholder('Select an item to add to cart')
                                            .addOptions(selectOptions.slice(0, 25)) // Discord limit
                                    );
                                
                                const navRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageButton()
                                            .setCustomId('prev_cat_page')
                                            .setLabel('◀ Previous')
                                            .setStyle('SECONDARY')
                                            .setDisabled(currentPage === 0),
                                        new MessageButton()
                                            .setCustomId('next_cat_page')
                                            .setLabel('Next ▶')
                                            .setStyle('SECONDARY')
                                            .setDisabled(endIdx >= items.length),
                                        new MessageButton()
                                            .setCustomId('back_to_categories')
                                            .setLabel('← Back')
                                            .setStyle('PRIMARY')
                                    );
                                
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle(`${category.emoji} ${category.name}`)
                                            .setDescription(desc)
                                            .setFooter({ text: `${items.length} items total` })
                                    ],
                                    components: [selectRow, navRow]
                                });
                                return;
                            }
                            
                            // Handle pagination - PREV
                            if (i.customId === 'prev_cat_page') {
                                currentPage = Math.max(0, currentPage - 1);
                                
                                const category = categories[currentCategory];
                                const items = category.items;
                                const startIdx = currentPage * ITEMS_PER_PAGE;
                                const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, items.length);
                                const pageItems = items.slice(startIdx, endIdx);
                                
                                let desc = `**Page ${currentPage + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}**\n\n`;
                                const selectOptions = [];
                                
                                for (let idx = 0; idx < pageItems.length; idx++) {
                                    const item = pageItems[idx];
                                    const globalIdx = startIdx + idx;
                                    desc += `${idx + 1}. **${item.name}** — $${item.averagePrice}\n   ${item.description || 'No description'}\n\n`;
                                    
                                    selectOptions.push({
                                        label: item.name.substring(0, 100),
                                        description: `$${item.averagePrice}`,
                                        value: `item_${globalIdx}`
                                    });
                                }
                                
                                const selectRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageSelectMenu()
                                            .setCustomId('select_item')
                                            .setPlaceholder('Select an item to add to cart')
                                            .addOptions(selectOptions.slice(0, 25))
                                    );
                                
                                const navRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageButton()
                                            .setCustomId('prev_cat_page')
                                            .setLabel('◀ Previous')
                                            .setStyle('SECONDARY')
                                            .setDisabled(currentPage === 0),
                                        new MessageButton()
                                            .setCustomId('next_cat_page')
                                            .setLabel('Next ▶')
                                            .setStyle('SECONDARY')
                                            .setDisabled(endIdx >= items.length),
                                        new MessageButton()
                                            .setCustomId('back_to_categories')
                                            .setLabel('← Back')
                                            .setStyle('PRIMARY')
                                    );
                                
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle(`${category.emoji} ${category.name}`)
                                            .setDescription(desc)
                                            .setFooter({ text: `${items.length} items total` })
                                    ],
                                    components: [selectRow, navRow]
                                });
                                return;
                            }
                            
                            // Handle pagination - NEXT
                            if (i.customId === 'next_cat_page') {
                                const category = categories[currentCategory];
                                const maxPages = Math.ceil(category.items.length / ITEMS_PER_PAGE);
                                currentPage = Math.min(maxPages - 1, currentPage + 1);
                                
                                const items = category.items;
                                const startIdx = currentPage * ITEMS_PER_PAGE;
                                const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, items.length);
                                const pageItems = items.slice(startIdx, endIdx);
                                
                                let desc = `**Page ${currentPage + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}**\n\n`;
                                const selectOptions = [];
                                
                                for (let idx = 0; idx < pageItems.length; idx++) {
                                    const item = pageItems[idx];
                                    const globalIdx = startIdx + idx;
                                    desc += `${idx + 1}. **${item.name}** — $${item.averagePrice}\n   ${item.description || 'No description'}\n\n`;
                                    
                                    selectOptions.push({
                                        label: item.name.substring(0, 100),
                                        description: `$${item.averagePrice}`,
                                        value: `item_${globalIdx}`
                                    });
                                }
                                
                                const selectRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageSelectMenu()
                                            .setCustomId('select_item')
                                            .setPlaceholder('Select an item to add to cart')
                                            .addOptions(selectOptions.slice(0, 25))
                                    );
                                
                                const navRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageButton()
                                            .setCustomId('prev_cat_page')
                                            .setLabel('◀ Previous')
                                            .setStyle('SECONDARY')
                                            .setDisabled(currentPage === 0),
                                        new MessageButton()
                                            .setCustomId('next_cat_page')
                                            .setLabel('Next ▶')
                                            .setStyle('SECONDARY')
                                            .setDisabled(endIdx >= items.length),
                                        new MessageButton()
                                            .setCustomId('back_to_categories')
                                            .setLabel('← Back')
                                            .setStyle('PRIMARY')
                                    );
                                
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle(`${category.emoji} ${category.name}`)
                                            .setDescription(desc)
                                            .setFooter({ text: `${items.length} items total` })
                                    ],
                                    components: [selectRow, navRow]
                                });
                                return;
                            }
                            
                            // Back to categories
                            if (i.customId === 'back_to_categories') {
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle('🛒 DayZ Shop - Select a Category')
                                            .setDescription('Browse items by category. Click a button below to view items.')
                                    ],
                                    components: updateCartButton()
                                });
                                return;
                            }
                            
                            // View cart
                            if (i.customId === 'view_cart') {
                                if (shoppingCart.size === 0) {
                                    await i.reply({ content: 'Your cart is empty!', ephemeral: true });
                                    return;
                                }
                                
                                let cartDesc = '';
                                let totalCost = 0;
                                const cartItems = [];
                                
                                for (const [itemIdx, qty] of shoppingCart.entries()) {
                                    const item = shopItems[itemIdx];
                                    const itemTotal = item.averagePrice * qty;
                                    totalCost += itemTotal;
                                    cartDesc += `**${item.name}** x${qty} — $${item.averagePrice} each = $${itemTotal}\n`;
                                    cartItems.push({ item, qty });
                                }
                                
                                const bal = await db.getBalance(guildId, userId);
                                cartDesc += `\n**Total: $${totalCost}**\n**Your Balance: $${bal}**`;
                                
                                const cartRow = new MessageActionRow()
                                    .addComponents(
                                        new MessageButton()
                                            .setCustomId('checkout')
                                            .setLabel('💳 Checkout')
                                            .setStyle('SUCCESS')
                                            .setDisabled(bal < totalCost),
                                        new MessageButton()
                                            .setCustomId('clear_cart')
                                            .setLabel('🗑️ Clear Cart')
                                            .setStyle('DANGER'),
                                        new MessageButton()
                                            .setCustomId('back_to_categories')
                                            .setLabel('← Continue Shopping')
                                            .setStyle('PRIMARY')
                                    );
                                
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle('🛒 Your Shopping Cart')
                                            .setDescription(cartDesc)
                                            .setFooter({ text: bal < totalCost ? 'Insufficient funds!' : 'Ready to checkout' })
                                    ],
                                    components: [cartRow]
                                });
                                return;
                            }
                            
                            // Clear cart
                            if (i.customId === 'clear_cart') {
                                shoppingCart.clear();
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#ff69b4')
                                            .setTitle('🛒 DayZ Shop - Select a Category')
                                            .setDescription('Cart cleared! Browse items by category.')
                                    ],
                                    components: updateCartButton()
                                });
                                return;
                            }
                            
                            // Checkout
                            if (i.customId === 'checkout') {
                                const totalCost = Array.from(shoppingCart.entries())
                                    .reduce((sum, [idx, qty]) => sum + (shopItems[idx].averagePrice * qty), 0);
                                
                                const bal = await db.getBalance(guildId, userId);
                                if (bal < totalCost) {
                                    await i.reply({ content: 'Insufficient funds!', ephemeral: true });
                                    return;
                                }
                                
                                // Deduct money
                                await db.addBalance(guildId, userId, -totalCost);
                                
                                // Get DayZ name
                                const dayzName = await db.getDayZName(guildId, userId) || interaction.user.username;
                                
                                // Add all items to spawn
                                for (const [itemIdx, qty] of shoppingCart.entries()) {
                                    const item = shopItems[itemIdx];
                                    
                                    if (DEV_MODE) {
                                        console.log(`[DEV] Would spawn ${qty}x ${item.name} for ${dayzName}`);
                                    } else {
                                        await addCupidSpawnEntry(guildId, dayzName, item.class, qty);
                                    }
                                }
                                
                                const itemList = Array.from(shoppingCart.entries())
                                    .map(([idx, qty]) => `${qty}x ${shopItems[idx].name}`)
                                    .join(', ');
                                
                                shoppingCart.clear();
                                
                                await i.update({
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor('#00ff00')
                                            .setTitle('✅ Purchase Complete!')
                                            .setDescription(DEV_MODE 
                                                ? `**DEV MODE**: Simulated purchase of:\n${itemList}\n\nTotal: $${totalCost}\n\nIn production, items will spawn on server restart.`
                                                : `You purchased:\n${itemList}\n\nTotal: $${totalCost}\nNew balance: $${bal - totalCost}\n\nItems will spawn on next server restart!`)
                                    ],
                                    components: [
                                        new MessageActionRow()
                                            .addComponents(
                                                new MessageButton()
                                                    .setCustomId('back_to_categories')
                                                    .setLabel('← Back to Shop')
                                                    .setStyle('PRIMARY')
                                            )
                                    ]
                                });
                                return;
                            }
                            
                        } catch (error) {
                            console.error('[SHOP] Error in collector:', error);
                            await i.reply({ content: 'An error occurred. Please try again.', ephemeral: true }).catch(() => {});
                        }
                    });
                    
                    collector.on('end', () => {
                        message.edit({ components: [] }).catch(() => {});
                    });
                    
                    console.log('[SHOP] Category browser sent');
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
        if (MINI_GAMES.includes(commandName) && commandName !== 'campaign') {
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
                
                // Apply buffs and calculate final reward
                const buffedBase = applyBuffs(guildId, userId, baseReward);
                const finalReward = Math.floor(buffedBase * (1 + rank.bonus));
                
                if (finalReward > 0) await db.addBalance(guildId, userId, finalReward);
                await completeGame(guildId, userId, finalReward, finalReward > 0);
                recordMiniGamePlay(userId, 'archery');
                
                // Trigger random event
                setTimeout(() => triggerRandomEvent(i, guildId, userId), 1000);
                
                let buffText = '';
                if (finalReward > buffedBase * (1 + rank.bonus)) {
                    buffText = '\n✨ **BUFF ACTIVE!**';
                }
                
                await i.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(finalReward > 0 ? '#43b581' : '#e74c3c')
                            .setTitle('🏹 Shot Result')
                            .setDescription(`${hit}${buffText}`)
                            .addField('Base Reward', baseReward > 0 ? `$${baseReward}` : 'None', true)
                            .addField(`${rank.emoji} Total`, finalReward > 0 ? `$${finalReward}` : 'None', true)
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
                const nextTime = nextAvailableMiniGame(userId, 'duel');
                const hours = Math.floor(nextTime / (1000 * 60 * 60));
                const minutes = Math.floor((nextTime % (1000 * 60 * 60)) / (1000 * 60));
                await interaction.reply({ content: `⏳ Thy sword arm needs rest! Return in ${hours}h ${minutes}m`, ephemeral: true });
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
            const oppBal = await db.getBalance(guildId, opponent.id);
            
            if (userBal < stakes) {
                await interaction.reply({ content: `💰 Thou dost not have $${stakes}! Balance: $${userBal}`, ephemeral: true });
                return;
            }
            if (oppBal < stakes) {
                await interaction.reply({ content: `💰 ${opponent.username} doth not have $${stakes} to match thy stakes!`, ephemeral: true });
                return;
            }
            
            // Create accept/decline buttons
            const acceptRow = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('duel_accept').setLabel('⚔️ Accept Duel').setStyle('DANGER'),
                new MessageButton().setCustomId('duel_decline').setLabel('🏳️ Decline').setStyle('SECONDARY')
            );
            
            const { MessageEmbed } = require('discord.js');
            await interaction.reply({
                content: `<@${opponent.id}>`,
                embeds: [new MessageEmbed()
                    .setColor('#e74c3c')
                    .setTitle('⚔️ Duel Challenge!')
                    .setDescription(`**${interaction.user.username}** challenges **${opponent.username}** to honorable combat!\n\n💰 Stakes: **$${stakes} each**\n🏆 Winner takes: **$${stakes * 2}**\n\n${opponent}, dost thou accept?`)
                    .setFooter({ text: '30 seconds to respond' })],
                components: [acceptRow]
            });
            
            const filter = i => i.user.id === opponent.id && (i.customId === 'duel_accept' || i.customId === 'duel_decline');
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async i => {
                if (i.customId === 'duel_decline') {
                    await i.update({
                        embeds: [new MessageEmbed()
                            .setColor('#95a5a6')
                            .setTitle('🏳️ Duel Declined')
                            .setDescription(`${opponent.username} hath declined the challenge!`)],
                        components: []
                    });
                    return;
                }
                
                // DUEL ACCEPTED - Start combat!
                await i.update({
                    embeds: [new MessageEmbed()
                        .setColor('#f39c12')
                        .setTitle('⚔️ DUEL ACCEPTED!')
                        .setDescription(`**${interaction.user.username}** vs **${opponent.username}**\n\nPrepare for combat!\n\n⏳ Round 1 of 3 starting...`)],
                    components: []
                });
                
                // Deduct stakes from both players
                await db.addBalance(guildId, userId, -stakes);
                await db.addBalance(guildId, opponent.id, -stakes);
                
                let challengerWins = 0;
                let opponentWins = 0;
                const rounds = [];
                
                // 3 rounds of combat
                for (let round = 1; round <= 3; round++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const combatRow = new MessageActionRow().addComponents(
                        new MessageButton().setCustomId('attack').setLabel('⚔️ Attack').setStyle('DANGER'),
                        new MessageButton().setCustomId('defend').setLabel('🛡️ Defend').setStyle('PRIMARY'),
                        new MessageButton().setCustomId('counter').setLabel('🗡️ Counter').setStyle('SUCCESS')
                    );
                    
                    await interaction.followUp({
                        content: `<@${userId}> <@${opponent.id}>`,
                        embeds: [new MessageEmbed()
                            .setColor('#e74c3c')
                            .setTitle(`⚔️ Round ${round} of 3`)
                            .setDescription(`**Choose thy move!**\n\n⚔️ **Attack** - Strong offense\n🛡️ **Defend** - Block attacks\n🗡️ **Counter** - Risky but powerful\n\n${challengerWins > opponentWins ? `${interaction.user.username} leads!` : opponentWins > challengerWins ? `${opponent.username} leads!` : 'Tie game!'}`)
                            .setFooter({ text: '10 seconds to choose!' })],
                        components: [combatRow]
                    });
                    
                    const roundFilter = i2 => (i2.user.id === userId || i2.user.id === opponent.id) && ['attack', 'defend', 'counter'].includes(i2.customId);
                    const roundCollector = interaction.channel.createMessageComponentCollector({ filter: roundFilter, time: 10000 });
                    
                    const choices = {};
                    
                    await new Promise((resolve) => {
                        roundCollector.on('collect', async i2 => {
                            if (choices[i2.user.id]) {
                                await i2.reply({ content: 'Thou hast already chosen!', ephemeral: true });
                                return;
                            }
                            
                            choices[i2.user.id] = i2.customId;
                            await i2.reply({ content: `⚔️ Move selected!`, ephemeral: true });
                            
                            if (choices[userId] && choices[opponent.id]) {
                                roundCollector.stop();
                                resolve();
                            }
                        });
                        
                        roundCollector.on('end', () => resolve());
                    });
                    
                    // Default to random if no choice
                    if (!choices[userId]) choices[userId] = ['attack', 'defend', 'counter'][Math.floor(Math.random() * 3)];
                    if (!choices[opponent.id]) choices[opponent.id] = ['attack', 'defend', 'counter'][Math.floor(Math.random() * 3)];
                    
                    // Determine winner: attack beats counter, counter beats defend, defend beats attack
                    const challengerMove = choices[userId];
                    const opponentMove = choices[opponent.id];
                    
                    let roundWinner = null;
                    if (challengerMove === opponentMove) {
                        roundWinner = 'tie';
                    } else if (
                        (challengerMove === 'attack' && opponentMove === 'counter') ||
                        (challengerMove === 'counter' && opponentMove === 'defend') ||
                        (challengerMove === 'defend' && opponentMove === 'attack')
                    ) {
                        roundWinner = 'challenger';
                        challengerWins++;
                    } else {
                        roundWinner = 'opponent';
                        opponentWins++;
                    }
                    
                    rounds.push({ round, challengerMove, opponentMove, winner: roundWinner });
                    
                    const moveEmoji = { attack: '⚔️', defend: '🛡️', counter: '🗡️' };
                    await interaction.followUp({
                        embeds: [new MessageEmbed()
                            .setColor(roundWinner === 'tie' ? '#95a5a6' : '#f39c12')
                            .setTitle(`Round ${round} Result`)
                            .setDescription(`**${interaction.user.username}**: ${moveEmoji[challengerMove]} ${challengerMove}\n**${opponent.username}**: ${moveEmoji[opponentMove]} ${opponentMove}\n\n${roundWinner === 'tie' ? '⚔️ **TIE!**' : roundWinner === 'challenger' ? `⚔️ **${interaction.user.username} wins the round!**` : `⚔️ **${opponent.username} wins the round!**`}\n\nScore: ${challengerWins} - ${opponentWins}`)],
                        components: []
                    });
                }
                
                // Determine final winner
                const winner = challengerWins > opponentWins ? userId : opponent.id;
                const loser = winner === userId ? opponent.id : userId;
                const winnerUser = winner === userId ? interaction.user : opponent;
                
                // Award winnings
                await db.addBalance(guildId, winner, stakes * 2);
                recordMiniGamePlay(userId, 'duel');
                
                // Record duel in history
                await db.query(`
                    INSERT INTO duel_history (guild_id, challenger_id, opponent_id, stakes, winner_id, rounds_data)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [guildId, userId, opponent.id, stakes, winner, JSON.stringify(rounds)]);
                
                // Check duel achievement
                const duelWins = await db.query(
                    'SELECT COUNT(*) as wins FROM duel_history WHERE guild_id = $1 AND winner_id = $2',
                    [guildId, winner]
                );
                
                let achievementText = '';
                if (duelWins.rows[0].wins >= 5 && !(await db.hasAchievement(guildId, winner, 'duel_win_5'))) {
                    await db.unlockAchievement(guildId, winner, 'duel_win_5');
                    await db.addBalance(guildId, winner, ACHIEVEMENTS.duel_win_5.reward);
                    achievementText = `\n\n🏆 **ACHIEVEMENT UNLOCKED!**\n${ACHIEVEMENTS.duel_win_5.emoji} **${ACHIEVEMENTS.duel_win_5.name}** - $${ACHIEVEMENTS.duel_win_5.reward}`;
                }
                
                await interaction.followUp({
                    embeds: [new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('⚔️ DUEL COMPLETE!')
                        .setDescription(`**🏆 WINNER: ${winnerUser.username}**\n\nFinal Score: ${challengerWins} - ${opponentWins}\n\n💰 ${winnerUser.username} wins **$${stakes * 2}**!${achievementText}`)
                        .setFooter({ text: 'Honor and glory to the victor!' })],
                    components: []
                });
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({
                        embeds: [new MessageEmbed()
                            .setColor('#95a5a6')
                            .setTitle('⏰ Challenge Expired')
                            .setDescription(`${opponent.username} did not respond in time.`)],
                        components: []
                    });
                }
            });
            
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
            
        // ========== HUNTING ==========
        } else if (commandName === 'hunting') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'hunting')) {
                return interaction.reply({ content: `🔒 **Hunting** unlocks at **Knight** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'hunting')) {
                const next = nextAvailableMiniGame(userId, 'hunting');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('deer').setLabel('🦌 Hunt Deer').setStyle('PRIMARY'),
                new MessageButton().setCustomId('boar').setLabel('🐗 Hunt Boar').setStyle('DANGER'),
                new MessageButton().setCustomId('rabbit').setLabel('🐰 Hunt Rabbit').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#8b4513')
                    .setTitle('🏹 Royal Forest Hunting')
                    .setDescription('**Choose thy quarry, noble hunter!**\n\n🦌 **Deer** - High reward, tricky shot\n🐗 **Boar** - Dangerous but valuable\n🐰 **Rabbit** - Quick and easy prey')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy hunt!', ephemeral: true });
                
                const choices = {
                    deer: { animal: 'Deer', base: 200, chance: 0.60, emoji: '🦌' },
                    boar: { animal: 'Boar', base: 250, chance: 0.50, emoji: '🐗' },
                    rabbit: { animal: 'Rabbit', base: 100, chance: 0.85, emoji: '🐰' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🏹 Drawing thy bow at the ${choice.emoji} ${choice.animal}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'hunting');
                        await i.editReply(`🎯 **Success!** Thou hast slain the ${choice.emoji} **${choice.animal}**! Earned **$${reward}** from the pelt! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'hunting');
                        await i.editReply(`💨 **Missed!** The ${choice.emoji} ${choice.animal} escaped into the forest!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The hunt hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== FISHING ==========
        } else if (commandName === 'fishing') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'fishing')) {
                return interaction.reply({ content: `🔒 **Fishing** is available to all ${rank.emoji} ${rank.name}s!`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'fishing')) {
                const next = nextAvailableMiniGame(userId, 'fishing');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('salmon').setLabel('🐟 Cast for Salmon').setStyle('PRIMARY'),
                new MessageButton().setCustomId('trout').setLabel('🎣 Cast for Trout').setStyle('SUCCESS'),
                new MessageButton().setCustomId('eel').setLabel('🦎 Cast for Eel').setStyle('SECONDARY')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#4682b4')
                    .setTitle('🎣 River Fishing')
                    .setDescription('**Cast thy nets into the flowing waters!**\n\n🐟 **Salmon** - Rare and valuable\n🎣 **Trout** - Common catch\n🦎 **Eel** - Slippery and elusive')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy fishing spot!', ephemeral: true });
                
                const choices = {
                    salmon: { fish: 'Salmon', base: 180, chance: 0.55, emoji: '🐟' },
                    trout: { fish: 'Trout', base: 120, chance: 0.75, emoji: '🎣' },
                    eel: { fish: 'Eel', base: 200, chance: 0.45, emoji: '🦎' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🎣 Casting thy net for ${choice.emoji} ${choice.fish}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'fishing');
                        await i.editReply(`🎣 **Catch!** Thou hast caught a ${choice.emoji} **${choice.fish}**! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'fishing');
                        await i.editReply(`💨 **Empty Net!** The ${choice.emoji} ${choice.fish} escaped!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The fishing session hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== MINING ==========
        } else if (commandName === 'mining') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'mining')) {
                return interaction.reply({ content: `🔒 **Mining** unlocks at **Knight** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'mining')) {
                const next = nextAvailableMiniGame(userId, 'mining');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('gold').setLabel('💛 Mine Gold').setStyle('PRIMARY'),
                new MessageButton().setCustomId('silver').setLabel('⚪ Mine Silver').setStyle('SECONDARY'),
                new MessageButton().setCustomId('gems').setLabel('💎 Mine Gems').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#ffd700')
                    .setTitle('⛏️ Mountain Mining')
                    .setDescription('**Dig deep for precious ores!**\n\n💛 **Gold** - Most valuable, risk of cave-in\n⚪ **Silver** - Reliable income\n💎 **Gems** - Rare but dangerous')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy mine!', ephemeral: true });
                
                const choices = {
                    gold: { ore: 'Gold', base: 300, chance: 0.50, emoji: '💛', item: 'gold_ore' },
                    silver: { ore: 'Silver', base: 150, chance: 0.70, emoji: '⚪', item: 'silver_ore' },
                    gems: { ore: 'Gems', base: 400, chance: 0.35, emoji: '💎', item: 'gem' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `⛏️ Mining for ${choice.emoji} ${choice.ore}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await completeGame(guildId, userId, reward, true);
                        
                        // Add crafting material to inventory
                        await db.addInventoryItem(guildId, userId, choice.item, 1);
                        
                        recordMiniGamePlay(userId, 'mining');
                        await i.editReply(`⛏️ **Strike!** Thou hast mined ${choice.emoji} **${choice.ore}**!\n\n💰 Earned **$${reward}**!\n🎒 +1 ${choice.emoji} ${choice.ore} added to inventory\n\n💡 Use materials in \`/blacksmith\` for bonus rewards! ${rank.emoji}`);
                    } else {
                        await completeGame(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'mining');
                        await i.editReply(`💥 **Cave-in!** Thou found nothing but rocks and dust!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The mining shift hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== HERBALISM ==========
        } else if (commandName === 'herbalism') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'herbalism')) {
                return interaction.reply({ content: `🔒 **Herbalism** is available to all ${rank.emoji} ${rank.name}s!`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'herbalism')) {
                const next = nextAvailableMiniGame(userId, 'herbalism');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('healing').setLabel('🌿 Healing Herbs').setStyle('SUCCESS'),
                new MessageButton().setCustomId('poison').setLabel('☠️ Poison Plants').setStyle('DANGER'),
                new MessageButton().setCustomId('rare').setLabel('✨ Rare Herbs').setStyle('PRIMARY')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#228b22')
                    .setTitle('🌿 Forest Herbalism')
                    .setDescription('**Gather herbs from the wild woods!**\n\n🌿 **Healing** - Safe and common\n☠️ **Poison** - Dangerous to gather\n✨ **Rare** - Valuable but elusive')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy gathering!', ephemeral: true });
                
                const choices = {
                    healing: { herb: 'Healing Herbs', base: 100, chance: 0.80, emoji: '🌿' },
                    poison: { herb: 'Poison Plants', base: 200, chance: 0.55, emoji: '☠️' },
                    rare: { herb: 'Rare Herbs', base: 250, chance: 0.40, emoji: '✨' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🌿 Gathering ${choice.emoji} ${choice.herb}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'herbalism');
                        await i.editReply(`🌿 **Success!** Thou hast gathered ${choice.emoji} **${choice.herb}**! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'herbalism');
                        await i.editReply(`🍂 **Nothing!** Thou found only weeds and brambles!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The gathering hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== BLACKSMITH ==========
        } else if (commandName === 'blacksmith') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'blacksmith')) {
                return interaction.reply({ content: `🔒 **Blacksmith** unlocks at **Baron** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'blacksmith')) {
                const next = nextAvailableMiniGame(userId, 'blacksmith');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            // Check for crafting materials
            const inventory = await db.getInventory(guildId, userId);
            const hasGoldOre = inventory.find(item => item.item_id === 'gold_ore' && item.quantity > 0);
            const hasSilverOre = inventory.find(item => item.item_id === 'silver_ore' && item.quantity > 0);
            const hasGem = inventory.find(item => item.item_id === 'gem' && item.quantity > 0);

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('crude').setLabel('🔨 Crude Quality').setStyle('SECONDARY'),
                new MessageButton().setCustomId('fine').setLabel('⚒️ Fine Quality').setStyle('PRIMARY'),
                new MessageButton().setCustomId('masterwork').setLabel('✨ Masterwork').setStyle('SUCCESS')
            );
            
            // Add enhanced crafting button if materials available
            if (hasGoldOre || hasSilverOre || hasGem) {
                row.addComponents(new MessageButton().setCustomId('enhanced').setLabel('💎 Enhanced Craft (Uses Materials)').setStyle('DANGER'));
            }

            let inventoryText = '';
            if (hasGoldOre || hasSilverOre || hasGem) {
                inventoryText = '\n\n**🎒 Materials Available:**';
                if (hasGoldOre) inventoryText += `\n💛 Gold Ore x${hasGoldOre.quantity}`;
                if (hasSilverOre) inventoryText += `\n⚪ Silver Ore x${hasSilverOre.quantity}`;
                if (hasGem) inventoryText += `\n💎 Gems x${hasGem.quantity}`;
            }

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#ff4500')
                    .setTitle('🔨 Blacksmith Forge')
                    .setDescription(`**Forge weapons and armor at thy anvil!**\n\n🔨 **Crude** - Easy to craft, lower value\n⚒️ **Fine** - Skilled work required\n✨ **Masterwork** - Legendary craftsmanship\n💎 **Enhanced** - Use materials for +200% rewards!${inventoryText}`)
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy forge!', ephemeral: true });
                
                const choices = {
                    crude: { quality: 'Crude', base: 150, chance: 0.85, emoji: '🔨' },
                    fine: { quality: 'Fine', base: 250, chance: 0.60, emoji: '⚒️' },
                    masterwork: { quality: 'Masterwork', base: 450, chance: 0.30, emoji: '✨' },
                    enhanced: { quality: 'Enhanced', base: 600, chance: 0.95, emoji: '💎', usesMaterials: true }
                };
                
                const choice = choices[i.customId];
                
                // Check if user selected enhanced but has no materials
                if (choice.usesMaterials) {
                    const inv = await db.getInventory(guildId, userId);
                    const goldOre = inv.find(item => item.item_id === 'gold_ore');
                    const silverOre = inv.find(item => item.item_id === 'silver_ore');
                    const gem = inv.find(item => item.item_id === 'gem');
                    
                    if (!goldOre && !silverOre && !gem) {
                        return i.reply({ content: '🎒 Thou hast no materials! Mine for resources first.', ephemeral: true });
                    }
                }
                
                await i.update({ content: `🔥 Forging ${choice.emoji} ${choice.quality} quality...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    let usedMaterials = '';
                    
                    if (success) {
                        let reward = Math.floor(choice.base * (1 + rank.bonus));
                        
                        // Consume materials and triple reward for enhanced crafting
                        if (choice.usesMaterials) {
                            const inv = await db.getInventory(guildId, userId);
                            let materialsUsed = [];
                            
                            // Try to use gold ore first
                            const goldOre = inv.find(item => item.item_id === 'gold_ore' && item.quantity > 0);
                            if (goldOre) {
                                await db.removeInventoryItem(guildId, userId, 'gold_ore', 1);
                                materialsUsed.push('💛 Gold Ore');
                                reward *= 3;
                            } else {
                                // Use silver ore
                                const silverOre = inv.find(item => item.item_id === 'silver_ore' && item.quantity > 0);
                                if (silverOre) {
                                    await db.removeInventoryItem(guildId, userId, 'silver_ore', 1);
                                    materialsUsed.push('⚪ Silver Ore');
                                    reward *= 2.5;
                                } else {
                                    // Use gem
                                    const gem = inv.find(item => item.item_id === 'gem' && item.quantity > 0);
                                    if (gem) {
                                        await db.removeInventoryItem(guildId, userId, 'gem', 1);
                                        materialsUsed.push('💎 Gem');
                                        reward *= 4;
                                    }
                                }
                            }
                            
                            reward = Math.floor(reward);
                            usedMaterials = `\n🔨 Materials Used: ${materialsUsed.join(', ')}`;
                        }
                        
                        await db.addBalance(guildId, userId, reward);
                        await completeGame(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'blacksmith');
                        await i.editReply(`🔨 **Forged!** Thou hast crafted ${choice.emoji} **${choice.quality}** quality!\n\n💰 Earned **$${reward}**!${usedMaterials} ${rank.emoji}`);
                    } else {
                        await completeGame(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'blacksmith');
                        await i.editReply(`💥 **Ruined!** The metal cracked and is worthless!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The forge hath cooled.', components: [], embeds: [] });
                }
            });
            
        // ========== ALCHEMY ==========
        } else if (commandName === 'alchemy') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'alchemy')) {
                return interaction.reply({ content: `🔒 **Alchemy** unlocks at **Earl** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'alchemy')) {
                const next = nextAvailableMiniGame(userId, 'alchemy');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('health').setLabel('💚 Health Potion').setStyle('SUCCESS'),
                new MessageButton().setCustomId('strength').setLabel('💪 Strength Elixir').setStyle('PRIMARY'),
                new MessageButton().setCustomId('transmute').setLabel('✨ Transmutation').setStyle('DANGER')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#9370db')
                    .setTitle('⚗️ Alchemy Laboratory')
                    .setDescription('**Mix potions in thy mystical lab!**\n\n💚 **Health** - Safe and reliable\n💪 **Strength** - Powerful but volatile\n✨ **Transmute** - Turn lead to gold... or explode!')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy laboratory!', ephemeral: true });
                
                const choices = {
                    health: { potion: 'Health Potion', base: 200, chance: 0.75, emoji: '💚' },
                    strength: { potion: 'Strength Elixir', base: 350, chance: 0.55, emoji: '💪' },
                    transmute: { potion: 'Transmutation', base: 600, chance: 0.30, emoji: '✨' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `⚗️ Mixing ${choice.emoji} ${choice.potion}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'alchemy');
                        await i.editReply(`⚗️ **Success!** Thou hast brewed ${choice.emoji} **${choice.potion}**! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'alchemy');
                        await i.editReply(`💥 **EXPLOSION!** The potion erupted in flames! Lab destroyed!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The alchemy session hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== BARD ==========
        } else if (commandName === 'bard') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'bard')) {
                return interaction.reply({ content: `🔒 **Bard Performance** unlocks at **Baron** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'bard')) {
                const next = nextAvailableMiniGame(userId, 'bard');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('ballad').setLabel('🎵 Ballad').setStyle('PRIMARY'),
                new MessageButton().setCustomId('jig').setLabel('💃 Lively Jig').setStyle('SUCCESS'),
                new MessageButton().setCustomId('epic').setLabel('⚔️ Epic Tale').setStyle('DANGER')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#ffa500')
                    .setTitle('🎵 Tavern Performance')
                    .setDescription('**Perform for the tavern patrons!**\n\n🎵 **Ballad** - Romantic and safe\n💃 **Jig** - Dance and be merry\n⚔️ **Epic** - Tell tales of heroes')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy performance!', ephemeral: true });
                
                const choices = {
                    ballad: { song: 'Ballad', base: 150, chance: 0.75, emoji: '🎵' },
                    jig: { song: 'Lively Jig', base: 200, chance: 0.65, emoji: '💃' },
                    epic: { song: 'Epic Tale', base: 300, chance: 0.50, emoji: '⚔️' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🎵 Performing ${choice.emoji} ${choice.song}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'bard');
                        await i.editReply(`🎵 **Applause!** The crowd loved thy ${choice.emoji} **${choice.song}**! Earned **$${reward}** in tips! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'bard');
                        await i.editReply(`🍅 **Booed!** The crowd threw rotten vegetables! No tips today!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The performance time hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== HORSE RACING ==========
        } else if (commandName === 'horseracing') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'horseracing')) {
                return interaction.reply({ content: `🔒 **Horse Racing** unlocks at **Earl** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'horseracing')) {
                const next = nextAvailableMiniGame(userId, 'horseracing');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('speed').setLabel('⚡ Speed Horse').setStyle('DANGER'),
                new MessageButton().setCustomId('stamina').setLabel('💪 Stamina Horse').setStyle('PRIMARY'),
                new MessageButton().setCustomId('balanced').setLabel('⚖️ Balanced Horse').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#8b4513')
                    .setTitle('🐴 Horse Racing Track')
                    .setDescription('**Choose thy steed for the race!**\n\n⚡ **Speed** - Fast but tires quickly\n💪 **Stamina** - Steady and reliable\n⚖️ **Balanced** - Mix of both')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy race!', ephemeral: true });
                
                const choices = {
                    speed: { horse: 'Speed Horse', base: 350, chance: 0.45, emoji: '⚡' },
                    stamina: { horse: 'Stamina Horse', base: 250, chance: 0.65, emoji: '💪' },
                    balanced: { horse: 'Balanced Horse', base: 300, chance: 0.55, emoji: '⚖️' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🏇 Racing with ${choice.emoji} ${choice.horse}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'horseracing');
                        await i.editReply(`🏆 **Victory!** Thy ${choice.emoji} **${choice.horse}** won the race! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'horseracing');
                        await i.editReply(`😞 **Lost!** Thy ${choice.emoji} ${choice.horse} finished in last place!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The race hath concluded.', components: [], embeds: [] });
                }
            });
            
        // ========== CHESS ==========
        } else if (commandName === 'chess') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'chess')) {
                return interaction.reply({ content: `🔒 **Chess** unlocks at **Duke** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'chess')) {
                const next = nextAvailableMiniGame(userId, 'chess');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('aggressive').setLabel('⚔️ Aggressive').setStyle('DANGER'),
                new MessageButton().setCustomId('defensive').setLabel('🛡️ Defensive').setStyle('PRIMARY'),
                new MessageButton().setCustomId('strategic').setLabel('🧠 Strategic').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#000000')
                    .setTitle('♟️ Noble Chess Match')
                    .setDescription('**Choose thy strategy against the grandmaster!**\n\n⚔️ **Aggressive** - Bold attacks\n🛡️ **Defensive** - Patient play\n🧠 **Strategic** - Long-term thinking')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy match!', ephemeral: true });
                
                const choices = {
                    aggressive: { strategy: 'Aggressive', base: 400, chance: 0.45, emoji: '⚔️' },
                    defensive: { strategy: 'Defensive', base: 300, chance: 0.60, emoji: '🛡️' },
                    strategic: { strategy: 'Strategic', base: 500, chance: 0.40, emoji: '🧠' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `♟️ Playing ${choice.emoji} ${choice.strategy} style...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'chess');
                        await i.editReply(`♟️ **Checkmate!** Thy ${choice.emoji} **${choice.strategy}** play prevailed! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'chess');
                        await i.editReply(`♔ **Defeated!** The grandmaster's skill surpassed thee!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The match hath concluded.', components: [], embeds: [] });
                }
            });
            
        // ========== RELIC HUNTING ==========
        } else if (commandName === 'relics') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'relics')) {
                return interaction.reply({ content: `🔒 **Relic Hunting** unlocks at **Duke** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'relics')) {
                const next = nextAvailableMiniGame(userId, 'relics');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('temple').setLabel('🏛️ Ancient Temple').setStyle('PRIMARY'),
                new MessageButton().setCustomId('tomb').setLabel('⚰️ Royal Tomb').setStyle('DANGER'),
                new MessageButton().setCustomId('vault').setLabel('🗝️ Hidden Vault').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#daa520')
                    .setTitle('🏛️ Relic Hunting Expedition')
                    .setDescription('**Explore ancient ruins for treasures!**\n\n🏛️ **Temple** - Sacred artifacts\n⚰️ **Tomb** - Cursed riches\n🗝️ **Vault** - Forgotten treasures')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy expedition!', ephemeral: true });
                
                const choices = {
                    temple: { location: 'Ancient Temple', base: 400, chance: 0.50, emoji: '🏛️' },
                    tomb: { location: 'Royal Tomb', base: 550, chance: 0.35, emoji: '⚰️' },
                    vault: { location: 'Hidden Vault', base: 700, chance: 0.25, emoji: '🗝️' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🔦 Exploring the ${choice.emoji} ${choice.location}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'relics');
                        await i.editReply(`✨ **Discovery!** Found ancient relics in the ${choice.emoji} **${choice.location}**! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'relics');
                        await i.editReply(`🪤 **Trapped!** Barely escaped with thy life! Found nothing!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The expedition hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== TOURNAMENT MELEE ==========
        } else if (commandName === 'tournamentmelee') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'tournamentmelee')) {
                return interaction.reply({ content: `🔒 **Tournament Melee** unlocks at **Duke** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'tournamentmelee')) {
                const next = nextAvailableMiniGame(userId, 'tournamentmelee');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('offense').setLabel('⚔️ All-Out Attack').setStyle('DANGER'),
                new MessageButton().setCustomId('balance').setLabel('⚖️ Balanced Style').setStyle('PRIMARY'),
                new MessageButton().setCustomId('defense').setLabel('🛡️ Defensive Stance').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#8b0000')
                    .setTitle('⚔️ Grand Melee Tournament')
                    .setDescription('**Face multiple opponents in group combat!**\n\n⚔️ **Attack** - Risky but rewarding\n⚖️ **Balanced** - Even approach\n🛡️ **Defense** - Survive longer')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy melee!', ephemeral: true });
                
                const choices = {
                    offense: { style: 'All-Out Attack', base: 600, chance: 0.35, emoji: '⚔️' },
                    balance: { style: 'Balanced Style', base: 450, chance: 0.50, emoji: '⚖️' },
                    defense: { style: 'Defensive Stance', base: 350, chance: 0.65, emoji: '🛡️' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `⚔️ Fighting with ${choice.emoji} ${choice.style}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'tournamentmelee');
                        await i.editReply(`🏆 **Champion!** Victory with ${choice.emoji} **${choice.style}**! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'tournamentmelee');
                        await i.editReply(`🗡️ **Defeated!** Thou wast knocked from the melee!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The melee hath concluded.', components: [], embeds: [] });
                }
            });
            
        // ========== BEAST TAMING ==========
        } else if (commandName === 'beasttaming') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'beasttaming')) {
                return interaction.reply({ content: `🔒 **Beast Taming** unlocks at **King** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'beasttaming')) {
                const next = nextAvailableMiniGame(userId, 'beasttaming');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('wolf').setLabel('🐺 Tame Wolf').setStyle('PRIMARY'),
                new MessageButton().setCustomId('bear').setLabel('🐻 Tame Bear').setStyle('DANGER'),
                new MessageButton().setCustomId('eagle').setLabel('🦅 Tame Eagle').setStyle('SUCCESS')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#654321')
                    .setTitle('🐻 Beast Taming Challenge')
                    .setDescription('**Only the King can tame wild beasts!**\n\n🐺 **Wolf** - Loyal but fierce\n🐻 **Bear** - Powerful and dangerous\n🦅 **Eagle** - Majestic and swift')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy taming!', ephemeral: true });
                
                const choices = {
                    wolf: { beast: 'Wolf', base: 500, chance: 0.50, emoji: '🐺' },
                    bear: { beast: 'Bear', base: 800, chance: 0.30, emoji: '🐻' },
                    eagle: { beast: 'Eagle', base: 650, chance: 0.40, emoji: '🦅' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🐻 Attempting to tame the ${choice.emoji} ${choice.beast}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'beasttaming');
                        await i.editReply(`🐻 **Tamed!** The ${choice.emoji} **${choice.beast}** is now thy companion! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'beasttaming');
                        await i.editReply(`😱 **Failed!** The ${choice.emoji} ${choice.beast} remained wild and fled!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The taming hath ended.', components: [], embeds: [] });
                }
            });
            
        // ========== SIEGE DEFENSE ==========
        } else if (commandName === 'siegedefense') {
            const stats = await getUserStats(guildId, userId);
            const rank = getRank(stats.total_earned);
            if (!canPlayGame(rank, 'siegedefense')) {
                return interaction.reply({ content: `🔒 **Siege Defense** unlocks at **King** rank! Thou art but a ${rank.emoji} ${rank.name}.`, ephemeral: true });
            }
            if (!canPlayMiniGame(userId, 'siegedefense')) {
                const next = nextAvailableMiniGame(userId, 'siegedefense');
                const hours = Math.floor(next / (1000 * 60 * 60));
                const minutes = Math.floor((next % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏰ Thou must rest! Try again in ${hours}h ${minutes}m.`, ephemeral: true });
            }

            const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId('archers').setLabel('🏹 Deploy Archers').setStyle('SUCCESS'),
                new MessageButton().setCustomId('cavalry').setLabel('🐴 Send Cavalry').setStyle('DANGER'),
                new MessageButton().setCustomId('siege').setLabel('🔥 Use Siege Weapons').setStyle('PRIMARY')
            );

            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#2f4f4f')
                    .setTitle('🏰 Castle Siege Defense')
                    .setDescription('**Defend thy kingdom from invaders!**\n\n🏹 **Archers** - Steady defense\n🐴 **Cavalry** - Risky counter-attack\n🔥 **Siege** - Powerful but slow')
                    .setFooter({ text: `${rank.emoji} ${rank.name} | +${(rank.bonus * 100).toFixed(0)}% bonus` })],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== userId) return i.reply({ content: 'This be not thy siege!', ephemeral: true });
                
                const choices = {
                    archers: { tactic: 'Archers', base: 600, chance: 0.60, emoji: '🏹' },
                    cavalry: { tactic: 'Cavalry', base: 900, chance: 0.35, emoji: '🐴' },
                    siege: { tactic: 'Siege Weapons', base: 750, chance: 0.45, emoji: '🔥' }
                };
                
                const choice = choices[i.customId];
                await i.update({ content: `🏰 Deploying ${choice.emoji} ${choice.tactic}...`, components: [], embeds: [] });
                
                setTimeout(async () => {
                    const success = Math.random() < choice.chance;
                    if (success) {
                        const reward = Math.floor(choice.base * (1 + rank.bonus));
                        await db.addBalance(guildId, userId, reward);
                        await updateUserStats(guildId, userId, reward, true);
                        recordMiniGamePlay(userId, 'siegedefense');
                        await i.editReply(`🏰 **Defended!** Thy ${choice.emoji} **${choice.tactic}** repelled the invaders! Earned **$${reward}**! ${rank.emoji}`);
                    } else {
                        await updateUserStats(guildId, userId, 0, false);
                        recordMiniGamePlay(userId, 'siegedefense');
                        await i.editReply(`🔥 **Breached!** The castle walls were overcome! Kingdom lost!`);
                    }
                }, 2000);
                
                collector.stop();
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '⏰ The siege hath concluded.', components: [], embeds: [] });
                }
            });
            
        // ========== DAILY LOGIN REWARD ==========
        } else if (commandName === 'daily') {
            const today = new Date().toISOString().split('T')[0];
            const loginData = await db.getDailyLogin(guildId, userId);
            
            let streak = 1;
            let canClaim = true;
            
            if (loginData) {
                const lastClaim = new Date(loginData.last_claim_date).toISOString().split('T')[0];
                
                if (lastClaim === today) {
                    // Already claimed today
                    const reward = getDailyReward(loginData.current_streak);
                    const tomorrow = new Date(loginData.last_claim_date);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return interaction.reply({
                        embeds: [new MessageEmbed()
                            .setColor('#ff6b6b')
                            .setTitle('⏰ Already Claimed Today!')
                            .setDescription(`Thou hast already claimed thy daily reward!\n\n🔥 Current Streak: **${loginData.current_streak} days**\n💰 Today's Reward: **$${reward}**\n\nReturn tomorrow for day **${loginData.current_streak + 1}** reward!`)
                            .setFooter({ text: `Longest streak: ${loginData.longest_streak} days` })],
                        ephemeral: true
                    });
                }
                
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                if (lastClaim === yesterdayStr) {
                    // Continuing streak
                    streak = loginData.current_streak + 1;
                } else {
                    // Broke streak
                    streak = 1;
                }
            }
            
            // Calculate rewards
            const baseReward = getDailyReward(streak);
            const connectedToday = loginData?.last_connection_date === today;
            const bonusReward = connectedToday ? Math.floor(baseReward * 0.5) : 0;
            const totalReward = baseReward + bonusReward;
            
            // Award rewards
            await db.addBalance(guildId, userId, totalReward);
            await db.updateDailyLogin(guildId, userId, streak);
            
            // Check for streak achievements
            const stats = await getUserStats(guildId, userId);
            if (streak === 7 && !(await db.hasAchievement(guildId, userId, 'streak_7'))) {
                await db.unlockAchievement(guildId, userId, 'streak_7');
                await db.addBalance(guildId, userId, ACHIEVEMENTS.streak_7.reward);
                await interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#ffd700')
                        .setTitle('🎁 Daily Reward Claimed!')
                        .setDescription(`**Day ${streak} Reward!**\n\n💰 Base Reward: **$${baseReward}**${bonusReward > 0 ? `\n🎮 DayZ Bonus: **$${bonusReward}**` : ''}\n\n🏆 **ACHIEVEMENT UNLOCKED!**\n${ACHIEVEMENTS.streak_7.emoji} **${ACHIEVEMENTS.streak_7.name}** - $${ACHIEVEMENTS.streak_7.reward}\n\n💎 Total Earned: **$${totalReward + ACHIEVEMENTS.streak_7.reward}**`)
                        .setFooter({ text: `Come back tomorrow for day ${streak + 1}!` })]
                });
                return;
            }
            if (streak === 30 && !(await db.hasAchievement(guildId, userId, 'streak_30'))) {
                await db.unlockAchievement(guildId, userId, 'streak_30');
                await db.addBalance(guildId, userId, ACHIEVEMENTS.streak_30.reward);
                await interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#ffd700')
                        .setTitle('🎁 Daily Reward Claimed!')
                        .setDescription(`**Day ${streak} Reward!**\n\n💰 Base Reward: **$${baseReward}**${bonusReward > 0 ? `\n🎮 DayZ Bonus: **$${bonusReward}**` : ''}\n\n🏆 **ACHIEVEMENT UNLOCKED!**\n${ACHIEVEMENTS.streak_30.emoji} **${ACHIEVEMENTS.streak_30.name}** - $${ACHIEVEMENTS.streak_30.reward}\n\n💎 Total Earned: **$${totalReward + ACHIEVEMENTS.streak_30.reward}**`)
                        .setFooter({ text: `Incredible dedication! Keep the streak alive!` })]
                });
                return;
            }
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('🎁 Daily Reward Claimed!')
                    .setDescription(`**Day ${streak} Reward!**\n\n💰 Base Reward: **$${baseReward}**${bonusReward > 0 ? `\n🎮 DayZ Bonus: **$${bonusReward}** (Connected today!)` : `\n💡 Tip: Connect to DayZ for +50% bonus!`}\n\n💎 Total Earned: **$${totalReward}**\n🔥 Current Streak: **${streak} day${streak > 1 ? 's' : ''}**`)
                    .setFooter({ text: `Come back tomorrow for day ${streak + 1}!` })]
            });
            
        // ========== ACHIEVEMENTS ==========
        } else if (commandName === 'achievements') {
            const userAchievements = await db.getUserAchievements(guildId, userId);
            const unlockedIds = userAchievements.map(a => a.achievement_id);
            
            let description = '**🏆 Unlocked Achievements:**\n\n';
            let totalRewards = 0;
            
            for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
                const unlocked = unlockedIds.includes(id);
                if (unlocked) {
                    description += `✅ ${achievement.emoji} **${achievement.name}**\n*${achievement.description}* - $${achievement.reward}\n\n`;
                    totalRewards += achievement.reward;
                } else {
                    description += `🔒 ??? **${achievement.name}**\n*${achievement.description}* - $${achievement.reward}\n\n`;
                }
            }
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#ffd700')
                    .setTitle('🏆 Thy Achievements')
                    .setDescription(description)
                    .setFooter({ text: `${unlockedIds.length}/${Object.keys(ACHIEVEMENTS).length} unlocked | $${totalRewards} earned` })],
                ephemeral: true
            });
            
        // ========== GIFT ==========
        } else if (commandName === 'gift') {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            
            if (targetUser.id === userId) {
                return interaction.reply({ content: '❌ Thou cannot gift coin to thyself!', ephemeral: true });
            }
            if (targetUser.bot) {
                return interaction.reply({ content: '❌ Bots cannot receive gifts!', ephemeral: true });
            }
            if (amount < 50) {
                return interaction.reply({ content: '❌ Minimum gift is $50!', ephemeral: true });
            }
            
            const balance = await db.getBalance(guildId, userId);
            if (balance < amount) {
                return interaction.reply({ content: `❌ Thou dost not have $${amount}! Balance: $${balance}`, ephemeral: true });
            }
            
            await db.addBalance(guildId, userId, -amount);
            await db.addBalance(guildId, targetUser.id, amount);
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#ff69b4')
                    .setTitle('💝 Gift Sent!')
                    .setDescription(`Thou hast gifted **$${amount}** to ${targetUser}!\n\nA noble gesture of generosity! 🎁`)
                    .setFooter({ text: `Thy remaining balance: $${balance - amount}` })]
            });
            
        // ========== PROPERTIES ==========
        } else if (commandName === 'properties') {
            const properties = await db.getUserProperties(guildId, userId);
            
            if (properties.length === 0) {
                return interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle('🏛️ Thy Properties')
                        .setDescription('Thou dost not own any properties yet!\n\nUse `/buyproperty` to purchase property for passive daily income!')
                        .addField('Available Properties:', '🍺 **Tavern** - $10,000 ($50/day)\n⚒️ **Blacksmith Shop** - $20,000 ($125/day)\n🏛️ **Trading Post** - $35,000 ($250/day)\n🏰 **Castle** - $100,000 ($1,000/day)', false)],
                    ephemeral: true
                });
            }
            
            const today = new Date().toISOString().split('T')[0];
            let totalDailyIncome = 0;
            let uncollected = 0;
            
            let description = '';
            for (const property of properties) {
                totalDailyIncome += property.daily_income;
                const canCollect = !property.last_collection_date || property.last_collection_date < today;
                if (canCollect) uncollected += property.daily_income;
                
                description += `🏛️ **${property.property_name}**\n💰 Income: $${property.daily_income}/day\n${canCollect ? '✅ Ready to collect!' : '⏰ Collected today'}\n\n`;
            }
            
            // Auto-collect if available
            if (uncollected > 0) {
                const collected = await db.collectPropertyIncome(guildId, userId);
                await db.addBalance(guildId, userId, collected);
                description += `\n💎 **Auto-collected $${collected}!**`;
            }
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#daa520')
                    .setTitle('🏛️ Thy Properties')
                    .setDescription(description)
                    .setFooter({ text: `Total daily income: $${totalDailyIncome}` })],
                ephemeral: true
            });
            
        // ========== BUY PROPERTY ==========
        } else if (commandName === 'buyproperty') {
            const propertyType = interaction.options.getString('type');
            
            const PROPERTY_TYPES = {
                tavern: { name: '🍺 The Drunken Dragon Tavern', price: 10000, income: 50 },
                blacksmith_shop: { name: '⚒️ Ironforge Blacksmith', price: 20000, income: 125 },
                trading_post: { name: '🏛️ Silk Road Trading Post', price: 35000, income: 250 },
                castle: { name: '🏰 Castle Stoneguard', price: 100000, income: 1000 }
            };
            
            const property = PROPERTY_TYPES[propertyType];
            const balance = await db.getBalance(guildId, userId);
            
            if (balance < property.price) {
                return interaction.reply({ content: `❌ Thou needest $${property.price}! Balance: $${balance}`, ephemeral: true });
            }
            
            // Check if already owns this type
            const existing = await db.getUserProperties(guildId, userId);
            if (existing.some(p => p.property_type === propertyType)) {
                return interaction.reply({ content: `❌ Thou already ownest a ${property.name}!`, ephemeral: true });
            }
            
            await db.addBalance(guildId, userId, -property.price);
            await db.purchaseProperty(guildId, userId, propertyType, property.name, property.price, property.income);
            
            // Check property achievement
            const stats = await getUserStats(guildId, userId);
            let achievementText = '';
            if (!(await db.hasAchievement(guildId, userId, 'property_owner'))) {
                await db.unlockAchievement(guildId, userId, 'property_owner');
                await db.addBalance(guildId, userId, ACHIEVEMENTS.property_owner.reward);
                achievementText = `\n\n🏆 **ACHIEVEMENT UNLOCKED!**\n${ACHIEVEMENTS.property_owner.emoji} **${ACHIEVEMENTS.property_owner.name}** - $${ACHIEVEMENTS.property_owner.reward}`;
            }
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('🏛️ Property Purchased!')
                    .setDescription(`Congratulations! Thou art now the proud owner of:\n\n${property.name}\n\n💰 Purchase Price: $${property.price}\n📈 Daily Income: $${property.income}\n\nIncome is collected automatically when using \`/properties\`!${achievementText}`)
                    .setFooter({ text: `Thy remaining balance: $${balance - property.price}` })]
            });
            
        // ========== INVENTORY ==========
        } else if (commandName === 'inventory') {
            const inventory = await db.getInventory(guildId, userId);
            
            if (inventory.length === 0) {
                return interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle('🎒 Thy Inventory')
                        .setDescription('Thy inventory is empty!\n\nGather materials from `/mining` and use them in `/blacksmith` for enhanced rewards!')],
                    ephemeral: true
                });
            }
            
            const ITEM_NAMES = {
                gold_ore: '💛 Gold Ore',
                silver_ore: '⚪ Silver Ore',
                gem: '💎 Gem'
            };
            
            let description = '**Crafting Materials:**\n\n';
            for (const item of inventory) {
                const name = ITEM_NAMES[item.item_id] || item.item_id;
                description += `${name} x${item.quantity}\n`;
            }
            
            description += '\n💡 Use these materials in `/blacksmith` to craft enhanced items for bonus rewards!';
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#daa520')
                    .setTitle('🎒 Thy Inventory')
                    .setDescription(description)],
                ephemeral: true
            });
            
        // ========== WEEKLY LEADERBOARD ==========
        } else if (commandName === 'weeklyleaderboard') {
            const leaderboard = await db.getWeeklyLeaderboard(guildId, 10);
            
            if (leaderboard.length === 0) {
                return interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#ffd700')
                        .setTitle('📊 Weekly Leaderboard')
                        .setDescription('No earnings this week yet! Be the first!')],
                    ephemeral: true
                });
            }
            
            let description = '';
            const medals = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < leaderboard.length; i++) {
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                const user = await interaction.client.users.fetch(leaderboard[i].user_id);
                description += `${medal} **${user.username}** - $${leaderboard[i].total_earned}\n`;
            }
            
            await interaction.reply({
                embeds: [new MessageEmbed()
                    .setColor('#ffd700')
                    .setTitle('📊 Weekly Leaderboard')
                    .setDescription(`**Top Earners This Week:**\n\n${description}\n\n🏆 Top 3 win bonus rewards on Monday!`)
                    .setFooter({ text: 'Leaderboard resets every Monday' })]
            });
            
        // ========== CAMPAIGN ==========
        } else if (commandName === 'campaign') {
            // Check cooldown for campaign
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
                            .setTitle('⏳ Campaign Cooldown')
                            .setDescription(`Thy tales must rest! Complete a campaign once every 6 hours.\n\nTry again in **${h}h ${m}m**.`)
                    ],
                    ephemeral: true
                });
                return;
            }
            
            // Check all campaigns for progress
            const allProgress = [];
            for (const campaignId in CAMPAIGNS) {
                const progress = await db.getCampaignProgress(guildId, userId, campaignId);
                if (progress) {
                    allProgress.push({ ...progress, campaign: CAMPAIGNS[campaignId] });
                }
            }
            
            // If no active campaigns, show campaign selection
            if (allProgress.length === 0 || allProgress.every(p => p.completed)) {
                const row = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId('dragon_quest').setLabel('🐉 The Dragon\'s Curse').setStyle('DANGER'),
                    new MessageButton().setCustomId('witch_forest').setLabel('🧙‍♀️ The Witch of Darkwood').setStyle('SUCCESS')
                );
                
                let campaignsList = '';
                for (const campaignId in CAMPAIGNS) {
                    const campaign = CAMPAIGNS[campaignId];
                    const isCompleted = allProgress.find(p => p.campaign_id === campaignId && p.completed);
                    campaignsList += `\n\n${campaign.name}\n${campaign.description}${isCompleted ? ' ✅ **COMPLETED**' : ''}`;
                }
                
                await interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle('📖 Story Campaigns')
                        .setDescription(`**Choose thy adventure!**${campaignsList}\n\n_Each campaign has multiple chapters with choices that affect the outcome._`)],
                    components: [row]
                });
                
                const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });
                
                collector.on('collect', async i => {
                    if (i.user.id !== userId) return i.reply({ content: 'This be not thy quest!', ephemeral: true });
                    
                    const campaignId = i.customId;
                    const campaign = CAMPAIGNS[campaignId];
                    
                    // Start campaign at chapter 1
                    await db.startCampaign(guildId, userId, campaignId, 1);
                    
                    const chapter = campaign.chapters[0];
                    const choiceRow = new MessageActionRow();
                    chapter.choices.forEach(choice => {
                        choiceRow.addComponents(
                            new MessageButton()
                                .setCustomId(`campaign_${campaignId}_${chapter.num}_${choice.id}`)
                                .setLabel(choice.label)
                                .setStyle(choice.id === 'refuse' || choice.id === 'ignore' ? 'SECONDARY' : 'PRIMARY')
                        );
                    });
                    
                    await i.update({
                        embeds: [new MessageEmbed()
                            .setColor('#8b4513')
                            .setTitle(`📖 ${campaign.name}`)
                            .setDescription(`**Chapter ${chapter.num}: ${chapter.title}**\n\n${chapter.story}\n\n_Choose thy path..._`)],
                        components: [choiceRow]
                    });
                    
                    collector.stop();
                });
                
                collector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.editReply({ content: '📖 The quest book closes...', components: [] });
                    }
                });
                
            } else {
                // Continue active campaign
                const activeCampaign = allProgress.find(p => !p.completed);
                const campaign = activeCampaign.campaign;
                const chapterNum = activeCampaign.current_chapter;
                const chapter = campaign.chapters.find(c => c.num === chapterNum);
                
                if (!chapter) {
                    return interaction.reply({ content: '❌ Campaign data error. Please report to admins.', ephemeral: true });
                }
                
                const choiceRow = new MessageActionRow();
                chapter.choices.forEach(choice => {
                    choiceRow.addComponents(
                        new MessageButton()
                            .setCustomId(`campaign_${campaign.id}_${chapter.num}_${choice.id}`)
                            .setLabel(choice.label)
                            .setStyle(choice.id === 'refuse' || choice.id === 'ignore' ? 'SECONDARY' : 'PRIMARY')
                    );
                });
                
                await interaction.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#8b4513')
                        .setTitle(`📖 ${campaign.name}`)
                        .setDescription(`**Chapter ${chapter.num}: ${chapter.title}**\n\n${chapter.story}\n\n_Choose thy path..._`)],
                    components: [choiceRow]
                });
            }
        }
    },
    
    // Handle campaign choice button clicks
    async handleCampaignChoice(interaction) {
        const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
        const db = require('../database');
        
        // Format: campaign_{campaignId}_{chapterNum}_{choiceId}
        // Since campaign IDs can have underscores, we need to parse this carefully
        const customId = interaction.customId;
        const match = customId.match(/^campaign_(.+)_(\d+)_(.+)$/);
        
        if (!match) {
            return interaction.reply({ content: '❌ Invalid button format!', ephemeral: true });
        }
        
        const campaignId = match[1];
        const chapterNum = parseInt(match[2]);
        const choiceId = match[3];
        
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        
        console.log('[CAMPAIGN] Looking for campaign:', campaignId);
        console.log('[CAMPAIGN] Available campaigns:', Object.keys(CAMPAIGNS));
        
        const campaign = CAMPAIGNS[campaignId];
        if (!campaign) {
            console.log('[CAMPAIGN] Campaign not found!');
            return interaction.reply({ content: '❌ Invalid campaign!', ephemeral: true });
        }
        
        const chapter = campaign.chapters.find(c => c.num === chapterNum);
        if (!chapter) return interaction.reply({ content: '❌ Invalid chapter!', ephemeral: true });
        
        const choice = chapter.choices.find(c => c.id === choiceId);
        if (!choice) return interaction.reply({ content: '❌ Invalid choice!', ephemeral: true });
        
        await interaction.update({ content: '🎲 The fates decide...', components: [], embeds: [] });
        
        setTimeout(async () => {
            const success = Math.random() < choice.chance;
            
            if (!success) {
                // Failed the challenge
                await db.updateCampaignProgress(guildId, userId, campaignId, chapterNum, false);
                await interaction.editReply({
                    embeds: [new MessageEmbed()
                        .setColor('#ff0000')
                        .setTitle('💀 Failure!')
                        .setDescription('Thy quest hath ended in tragedy!\n\nThy choice was too risky. The adventure is over.\n\n_Use `/campaign` to try again from the beginning._')],
                    components: []
                });
                return;
            }
            
            // Check if there's a cost
            if (choice.cost) {
                const balance = await db.getBalance(guildId, userId);
                if (balance < choice.cost) {
                    return interaction.editReply({
                        content: `💰 Thou needest $${choice.cost} but hast only $${balance}!`,
                        components: [],
                        embeds: []
                    });
                }
                await db.addBalance(guildId, userId, -choice.cost);
            }
            
            // Award reward and track stats
            if (choice.reward > 0) {
                await db.addBalance(guildId, userId, choice.reward);
                await updateUserStats(guildId, userId, {
                    total_earned: choice.reward,
                    mini_games_played: 1,
                    mini_games_won: 1
                });
                await db.addWeeklyEarnings(guildId, userId, choice.reward);
            }
            
            // Check if this is the end
            if (choice.nextChapter === null) {
                // Campaign complete!
                await db.updateCampaignProgress(guildId, userId, campaignId, chapterNum, true);
                
                // Record cooldown on completion
                await db.addCooldown(guildId, userId, 'campaign', Date.now());
                await db.cleanOldCooldowns(guildId, userId, 'campaign', COOLDOWN_WINDOW);
                
                await interaction.editReply({
                    embeds: [new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('🎉 Quest Complete!')
                        .setDescription(`${choice.ending}\n\n💰 **Total Reward: $${choice.reward}**\n\n_Well done, adventurer! Use \`/campaign\` to start a new quest._`)],
                    components: []
                });
            } else {
                // Continue to next chapter
                await db.updateCampaignProgress(guildId, userId, campaignId, choice.nextChapter, false);
                
                const nextChapter = campaign.chapters.find(c => c.num === choice.nextChapter);
                const choiceRow = new MessageActionRow();
                nextChapter.choices.forEach(c => {
                    choiceRow.addComponents(
                        new MessageButton()
                            .setCustomId(`campaign_${campaignId}_${nextChapter.num}_${c.id}`)
                            .setLabel(c.label)
                            .setStyle(c.id === 'refuse' || c.id === 'ignore' ? 'SECONDARY' : 'PRIMARY')
                    );
                });
                
                let rewardText = choice.reward > 0 ? `\n\n💰 **Earned: $${choice.reward}**` : '';
                
                await interaction.editReply({
                    embeds: [new MessageEmbed()
                        .setColor('#00aa00')
                        .setTitle(`📖 ${campaign.name}`)
                        .setDescription(`**Success!**${rewardText}\n\n**Chapter ${nextChapter.num}: ${nextChapter.title}**\n\n${nextChapter.story}\n\n_Choose thy path..._`)],
                    components: [choiceRow]
                });
            }
        }, 2000);
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
