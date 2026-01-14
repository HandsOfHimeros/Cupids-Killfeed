const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

// Guild IDs
const guildIds = [
    '1386432422744162476', // Chernarus
    '1445943557020979274', // Livonia
    '1445957198000820316'  // Sakhal
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        const message = `@everyone

📜 **ROYAL PROCLAMATION - MAJOR KINGDOM EXPANSION!** 📜

**8 MASSIVE NEW INTERACTIVE FEATURES HAVE ARRIVED!**

💰 **DAILY LOGIN REWARDS**
• \`/daily\` - Claim rewards every day! Build streaks for up to $3,000!
• 🔗 **+50% BONUS** if connected to DayZ that day!

🏆 **ACHIEVEMENT SYSTEM**
• \`/achievements\` - 14 achievements with cash rewards!
• Auto-unlock as you play: First win, streaks, rank ups, wealth milestones!

🏰 **PROPERTY OWNERSHIP**
• \`/properties\` \`/buyproperty\` - Own taverns, shops, castles!
• 💵 Earn passive **daily income** while you sleep!

⚔️ **PVP DUEL SYSTEM**
• \`/duel @player amount\` - Challenge others to 3-round combat!
• Attack, Defend, or Counter - **Winner takes all!**

⛏️ **CRAFTING CHAINS**
• \`/mining\` - Gather gold ore, silver ore, and gems!
• \`/blacksmith\` - Use materials for **2x-4x reward multipliers!**

📖 **STORY CAMPAIGNS**
• \`/campaign\` - Epic multi-chapter quests with branching choices!
• 🐉 **The Dragon's Curse** | 🧙‍♀️ **The Witch of Darkwood**

🎲 **RANDOM EVENTS**
• Unexpected encounters while playing games!
• 💰 Treasures | 🗡️ Bandit Attacks | 🎪 Festivals | 🌟 Lucky Buffs

📊 **WEEKLY LEADERBOARDS**
• \`/weeklyleaderboard\` - Compete for top earner spots!
• Resets every Monday with bonus rewards!

🎁 **BONUS FEATURES**
• \`/gift @user amount\` - Send coins to friends!
• \`/inventory\` - View your crafting materials!

📈 **HOW TO GET STARTED:**
1️⃣ \`/daily\` - Claim your daily reward
2️⃣ \`/achievements\` - See what you've unlocked  
3️⃣ \`/campaign\` - Start an epic quest
4️⃣ Play games and watch for random events!

⚔️ **NOW WITH 48 SLASH COMMANDS!** ⚔️

*Go forth and experience the expanded kingdom!*

🏰👑 **LONG LIVE THE KING!** 👑🏰`;
        
        // Send to general and wop-general channels in each guild
        for (const guildId of guildIds) {
            try {
                const guild = await client.guilds.fetch(guildId);
                const channels = guild.channels.cache.filter(ch => 
                    ch.type === 'GUILD_TEXT' && (
                        ch.name === 'general' || 
                        ch.name === 'general-chat' || 
                        ch.name === '💬general' ||
                        ch.name === '💬-general' ||
                        ch.name === 'wop-general'
                    )
                );
                
                if (channels.size > 0) {
                    for (const [id, channel] of channels) {
                        await channel.send(message);
                        console.log(`Message sent to ${guild.name} (${channel.name})`);
                    }
                } else {
                    console.log(`No general/wop-general channels found for ${guild.name}`);
                    console.log('Available channels:', guild.channels.cache.filter(ch => ch.type === 'GUILD_TEXT').map(ch => ch.name).join(', '));
                }
            } catch (error) {
                console.error(`Error sending to guild ${guildId}:`, error.message);
            }
        }
        
        console.log('All announcements sent!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
});

client.login(config.TOKEN);
