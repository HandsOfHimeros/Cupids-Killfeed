const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
    ]
});

bot.once('ready', async () => {
    console.log(`Logged in as ${bot.user.tag}`);
    console.log('\nGuilds the bot is in:');
    bot.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (${guild.id})`);
    });
    console.log('');
    
    const embed = new MessageEmbed()
        .setColor('#FFD700')
        .setTitle('📜 ROYAL PROCLAMATION 📜')
        .setDescription('**Hear ye, hear ye! Major Kingdom Expansion!**\n\n@everyone')
        .addField('🎁 NEW INTERACTIVE FEATURES', 
            '8 massive new systems have been added to enrich thy medieval experience!', false)
        .addField('💰 Daily Login Rewards', 
            '`/daily` - Claim rewards daily! Build streaks for up to $3000!\n🔗 +50% bonus if connected to DayZ that day!', false)
        .addField('🏆 Achievement System', 
            '`/achievements` - 14 achievements with monetary rewards!\nAuto-unlock as you play and progress!', false)
        .addField('🏰 Property Ownership', 
            '`/properties` `/buyproperty` - Own taverns, shops, castles!\nEarn passive daily income while you sleep!', false)
        .addField('⚔️ PvP Duel System', 
            '`/duel @player amount` - Challenge others to 3-round combat!\nAttack, defend, or counter - winner takes all!', false)
        .addField('⛏️ Crafting Chains', 
            '`/mining` - Gather gold ore, silver ore, and gems!\n`/blacksmith` - Use materials for 2x-4x reward multipliers!', false)
        .addField('📖 Story Campaigns', 
            '`/campaign` - Epic multi-chapter quests with choices!\n🐉 The Dragon\'s Curse | 🧙‍♀️ The Witch of Darkwood', false)
        .addField('🎲 Random Events', 
            'Unexpected encounters while playing games!\n💰 Treasures | 🗡️ Bandits | 🎪 Festivals | 🌟 Lucky buffs', false)
        .addField('📊 Weekly Leaderboards', 
            '`/weeklyleaderboard` - Compete for top earner spots!\nResets every Monday with bonus rewards!', false)
        .addField('🎁 BONUS FEATURES', 
            '`/gift @user amount` - Send coins to friends!\n`/inventory` - View your crafting materials!', false)
        .addField('📈 How to Get Started', 
            '1️⃣ `/daily` - Claim your daily reward\n2️⃣ `/achievements` - See what you\'ve unlocked\n3️⃣ `/campaign` - Start an epic quest\n4️⃣ Play games and watch for random events!', false)
        .setFooter({ text: '⚔️ Now with 48 slash commands! • v203' })
        .setTimestamp();

    const guilds = [
        { id: '1300084853044215838', channelName: 'wop-general' },      // World Of Pantheon DAYZ
        { id: '1312098464175157248', channelName: 'general' },           // Pantheon at War DAYZ
        { id: '1322962913003872326', channelName: 'general' }            // Eternal Frost of Pantheon
    ];

    for (const guildInfo of guilds) {
        try {
            const guild = await bot.guilds.fetch(guildInfo.id);
            const channel = guild.channels.cache.find(ch => ch.name === guildInfo.channelName && ch.type === 'GUILD_TEXT');
            
            if (channel) {
                await channel.send({ embeds: [embed] });
                console.log(`✅ Announcement sent to ${guild.name} in #${channel.name}`);
            } else {
                console.log(`❌ Channel ${guildInfo.channelName} not found in ${guild.name}`);
            }
        } catch (error) {
            console.error(`❌ Error sending to guild ${guildInfo.id}:`, error.message);
        }
    }

    console.log('\n✅ All announcements sent!');
    process.exit(0);
});

bot.login(config.TOKEN);
