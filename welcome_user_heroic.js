const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const channelName = 'wop-general';
const userId = '991811249627205763';

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        // Find the channel across all guilds
        const channel = client.channels.cache.find(ch => ch.name === channelName);
        
        if (!channel) {
            console.log(`Channel "${channelName}" not found!`);
            process.exit(1);
        }
        
        const message = `🏹 ⚔️ **HARK! A NEW CHAMPION ENTERS THE REALM!** ⚔️ 🏹\n\n<@${userId}>\n\n**BEHOLD!** The gates of Pantheon swing wide, and through them strides a warrior whose legend is yet unwritten—but whose destiny is already calling!\n\n✨ **The gods have chosen you.** ✨\n\nYou stand now in the **WORLD OF PANTHEON**, where only the brave survive and only the legendary thrive. This wasteland is unforgiving, but you are not here by chance—you are here by **FATE**.\n\n🔥 **What awaits you:**\n• Battle against the elements and the undead\n• Forge alliances or stand alone as a lone wolf\n• Earn fortune with every step you take ($1 per 100m traveled!)\n• Build your legacy in blood and steel\n\n💪 The survivors here are warriors. The players here are legends. And YOU… you are about to join their ranks.\n\n**Welcome to the arena, champion. May your aim be true, your courage unwavering, and your survival eternal.**\n\n*Cupid and Himeros watch over you.* 🏹💘\n\n🎯 **Now rise, and show this world what you're made of!**`;
        
        await channel.send(message);
        console.log(`Welcome message sent to ${channel.name}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
});

client.login(config.TOKEN);
