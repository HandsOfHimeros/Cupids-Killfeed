const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

// Hardcode the guild IDs from your setup
const guildIds = [
    '1386432422744162476', // Chernarus
    '1445943557020979274', // Livonia
    '1445957198000820316'  // Sakhal
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        const message = `@everyone\n\n🗺️ ⚔️ **WARRIORS OF THE WASTELAND, ARISE!** ⚔️ 🗺️\n\n**A NEW ERA OF GLORY DAWNS UPON YOU!**\n\nHear ye, survivors! The gods have gazed upon your endless journeys across the harsh and unforgiving lands, and they have deemed you worthy of **REWARD**!\n\n✨ **Every step you take through this brutal world shall now earn you COIN!** ✨\n\n🏃 **Travel 100 meters → Earn $1**\n🏃 **Travel 1 kilometer → Earn $10**\n🏃 **Travel 10 kilometers → Earn $100**\n\nYour path through the wilderness is no longer just survival—it is **PROFIT**. Your journey is no longer just escape—it is **FORTUNE**!\n\n💰 **When you disconnect from the realm, your total distance traveled and earnings shall be revealed to all!**\n\n**The more you explore, the richer you become.**\n**The further you venture, the greater your legend.**\n**The longer you survive, the mightier your wealth.**\n\n🌟 *Let no valley go unexplored. Let no mountain go unclimbed. Let no road go untraveled. For every meter is a monument to your courage, and every step is silver in your pocket.*\n\n**GO FORTH, CHAMPIONS! THE WASTELAND REWARDS THE BOLD!** 🔥\n\n*— By decree of Cupid & Himeros* 🏹💘`;
        
        // Send to general channel in each guild
        for (const guildId of guildIds) {
            try {
                const guild = await client.guilds.fetch(guildId);
                const generalChannel = guild.channels.cache.find(ch => 
                    ch.name === 'general' || 
                    ch.name === 'general-chat' || 
                    ch.name === '💬general' ||
                    ch.name === '💬-general' ||
                    ch.name === 'wop-general'
                );
                
                if (generalChannel) {
                    await generalChannel.send(message);
                    console.log(`Message sent to ${guild.name} (${generalChannel.name})`);
                } else {
                    console.log(`No general channel found for ${guild.name}`);
                    console.log('Available channels:', guild.channels.cache.filter(ch => ch.type === 'GUILD_TEXT').map(ch => ch.name).join(', '));
                }
            } catch (error) {
                console.error(`Error sending to guild ${guildId}:`, error.message);
            }
        }
        
        console.log('All announcements sent!');
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
});

client.login(config.TOKEN);
