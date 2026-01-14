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

🏰 **HEAR YE! A ROYAL PROCLAMATION FROM THY KING!** 🏰

**THE GREAT EXPANSION HATH ARRIVED!**

Thy King bestows upon thee **13 NEW MEDIEVAL GAMES** to test thy courage and fortune!

⚔️ **RISE THROUGH THE RANKS** ⚔️
• 👨‍🌾 **Peasant** → ⚔️ **Knight** ($5k, +5%) → 🛡️ **Baron** ($15k, +10%)
• 🎖️ **Earl** ($35k, +15%, $100/day) → 👑 **Duke** ($75k, +20%, $250/day) 
• 🏰 **King** ($150k, +25%, $500/day)

🎮 **NEW GAMES** 🎮
🏹 /hunting | 🎣 /fishing | ⛏️ /mining | 🌿 /herbalism
🔨 /blacksmith | ⚗️ /alchemy | 🎵 /bard | 🐴 /horseracing
♟️ /chess | 🏛️ /relics | ⚔️ /tournamentmelee
🐻 /beasttaming | 🏰 /siegedefense *(King rank only!)*

**Plus all 14 original games remain!**

⏰ Each game playable once every 6 hours
💎 Use **/rank** to see thy progress & unlocked games
💰 Use **/wallet** to check thy riches

**All games are INTERACTIVE with buttons!**

*Go forth and prove thy worth! May fortune smile upon thee!*

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
