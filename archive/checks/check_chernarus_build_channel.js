require('dotenv').config();
const { Client, Intents } = require('discord.js');
const db = require('./database');

const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

bot.once('ready', async () => {
    console.log('Bot logged in as', bot.user.tag);
    
    try {
        const chernarusGuildId = '1386432422744162476';
        const config = await db.getGuildConfig(chernarusGuildId);
        
        console.log('\n📋 Chernarus Channel Configuration:');
        console.log('build_channel_id:', config.build_channel_id);
        console.log('suicide_channel_id:', config.suicide_channel_id);
        console.log('killfeed_channel_id:', config.killfeed_channel_id);
        console.log('connections_channel_id:', config.connections_channel_id);
        
        const guild = await bot.guilds.fetch(chernarusGuildId);
        console.log('\n🔍 Checking if channels exist in Discord:');
        
        if (config.build_channel_id) {
            try {
                const buildChannel = await guild.channels.fetch(config.build_channel_id);
                console.log(`✅ Build channel exists: #${buildChannel.name}`);
            } catch (e) {
                console.log(`❌ Build channel ${config.build_channel_id} NOT FOUND in Discord`);
            }
        }
        
        if (config.suicide_channel_id) {
            try {
                const suicideChannel = await guild.channels.fetch(config.suicide_channel_id);
                console.log(`✅ Suicide channel exists: #${suicideChannel.name}`);
            } catch (e) {
                console.log(`❌ Suicide channel ${config.suicide_channel_id} NOT FOUND in Discord`);
            }
        }
        
        console.log('\n🔍 Finding actual build-related channels:');
        const channels = await guild.channels.fetch();
        channels.forEach(channel => {
            if (channel.name && (channel.name.includes('build') || channel.name.includes('suicide'))) {
                console.log(`  ${channel.name} - ID: ${channel.id}`);
            }
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
});

bot.login(process.env.BOT_TOKEN);
