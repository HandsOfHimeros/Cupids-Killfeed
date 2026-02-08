const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

client.once('ready', async () => {
    console.log('Bot ready, sending announcement...');
    
    try {
        const guild = await client.guilds.fetch(config.GUILDID);
        const channels = await guild.channels.fetch();
        
        // Find announcements channel
        const announcementChannel = channels.find(ch => 
            ch.name.toLowerCase().includes('announcement') || 
            ch.name.toLowerCase().includes('announce')
        );
        
        if (!announcementChannel) {
            console.log('Available channels:');
            channels.forEach(ch => console.log(`  ${ch.name} (${ch.type}) - ${ch.id}`));
            console.log('\nPlease specify the announcement channel ID or name');
            process.exit(1);
        }
        
        console.log(`Found channel: ${announcementChannel.name}`);
        
        const embed = new MessageEmbed()
            .setColor('#FFD700')
            .setTitle('🎉 THE ECONOMY AWAKENS! 🎉')
            .setDescription(`
**ATTENTION SURVIVORS!**

The time has come! After rigorous testing and preparation, the **DayZero Economy & Shop System** is now **LIVE** and ready for action!

🏪 **THE SHOP IS OPEN**
Purchase weapons, gear, and supplies delivered directly to your location on the next server restart!

💰 **EARN YOUR FORTUNE**
Work jobs, play mini-games, rob, steal, and build your wealth!

📍 **LOCATION-BASED SPAWNS**
Items spawn at YOUR last known position - no more running across the map!

⚔️ **BATTLE-TESTED FEATURES**
• Smart cleanup system (items spawn once per restart)
• 6-hour cooldowns on earning commands
• Automatic backups to protect your hard-earned money
• Name registration system for accurate spawns

🎮 **GET STARTED NOW**
Type \`/shophelp\` to see the complete guide and start your journey to wealth and power!

**The island is yours for the taking. Will you rise to the challenge?**
            `)
            .setFooter({ text: 'Server restarts at 3, 6, 9, 12 AM/PM EST - Your items spawn after restart!' })
            .setTimestamp();
        
        await announcementChannel.send({
            content: '@everyone',
            embeds: [embed]
        });
        
        console.log('✅ Announcement sent successfully!');
        process.exit(0);
        
    } catch (err) {
        console.error('Error sending announcement:', err.message);
        process.exit(1);
    }
});

client.login(config.TOKEN);
