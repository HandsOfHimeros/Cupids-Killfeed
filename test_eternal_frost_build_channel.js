const { Client, Intents } = require('discord.js');
const db = require('./database');

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

bot.once('ready', async () => {
    console.log('=== ETERNAL FROST BUILD CHANNEL TEST ===\n');
    
    const eternalFrostId = '1445943557020979274';
    const buildChannelId = '1455446097609625653';
    
    try {
        // Get guild
        const guild = await bot.guilds.fetch(eternalFrostId);
        console.log(`✅ Guild found: ${guild.name}`);
        
        // Get build channel
        const buildChannel = await bot.channels.fetch(buildChannelId);
        
        if (!buildChannel) {
            console.log('❌ Build channel not found!');
        } else {
            console.log(`✅ Build channel found: #${buildChannel.name}`);
            console.log(`   Type: ${buildChannel.type}`);
            console.log(`   Guild: ${buildChannel.guild.name}`);
            
            // Try to send a test message
            try {
                await buildChannel.send('🏗️ **Build Log Test** - Testing Eternal Frost build channel access');
                console.log('✅ Successfully sent test message!');
            } catch (sendErr) {
                console.log('❌ Cannot send messages to build channel!');
                console.log('   Error:', sendErr.message);
            }
        }
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
});

bot.login(process.env.DISCORD_TOKEN);
