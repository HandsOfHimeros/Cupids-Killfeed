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
        const message = `🏹 **THE LEGEND OF CUPID & HIMEROS** 💘\n\n*In the realm of immortals, where legends are born and heroes are forged, two brothers stand eternal—bound by blood, driven by desire.*\n\n**Cupid**, the divine archer of love, whose golden arrows pierce the hearts of mortals and gods alike. His aim is true, his purpose unwavering—to unite souls in the throes of passion and devotion.\n\n**Himeros**, the embodiment of longing itself, whose very presence ignites the flames of yearning in all who encounter him. Where Cupid strikes, Himeros kindles—desire becomes destiny.\n\nTogether, these celestial brothers command the most powerful force known to existence: *the human heart*. They are not merely gods—they are what every soul craves, what every warrior fights for, what every survivor dreams of in the darkest night.\n\n**We are all drawn to them. We all desire them. For without desire, there is no will to survive. Without love, there is no reason to fight.**\n\n*In this wasteland, remember: You are touched by the divine. You are survivors of passion. You are warriors of the heart.*\n\n⚔️ 💖 **Cupid and Himeros watch over you.** 💖 ⚔️`;
        
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
        
        console.log('All messages sent!');
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
});

client.login(config.TOKEN);
