const { Client, Intents, MessageEmbed } = require('discord.js');
const db = require('./database');
const config = require('./config.json');

// Test posting to the killfeed channel
async function testPostKillfeed() {
    const bot = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES
        ]
    });

    await bot.login(config.TOKEN);

    // Wait for bot to be ready
    await new Promise(resolve => {
        bot.once('ready', () => {
            console.log(`✅ Bot logged in as ${bot.user.tag}`);
            resolve();
        });
    });

    // Get the guild config
    const guildId = '1386432422744162476';
    const guildConfig = await db.getGuildConfig(guildId);

    if (!guildConfig) {
        console.log('❌ Guild not found in database');
        process.exit(1);
    }

    console.log('\n=== GUILD CONFIG ===');
    console.log(`Guild ID: ${guildConfig.guild_id}`);
    console.log(`Killfeed Channel ID: ${guildConfig.killfeed_channel_id}`);
    console.log(`Connections Channel ID: ${guildConfig.connections_channel_id}`);

    if (!guildConfig.killfeed_channel_id) {
        console.log('❌ Killfeed channel ID is NULL');
        process.exit(1);
    }

    // Try to fetch the channel
    console.log('\n=== FETCHING CHANNEL ===');
    try {
        const channel = await bot.channels.fetch(guildConfig.killfeed_channel_id);
        if (!channel) {
            console.log('❌ Channel not found');
            process.exit(1);
        }
        console.log(`✅ Channel found: ${channel.name}`);

        // Try to post a test message
        console.log('\n=== POSTING TEST MESSAGE ===');
        const testEmbed = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle('🧪 Killfeed Test')
            .setDescription('This is a test message to verify killfeed posting works')
            .addField('Status', 'Testing', true)
            .setTimestamp();

        await channel.send({ embeds: [testEmbed] });
        console.log('✅ Test message posted successfully!');
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.code === 50001) {
            console.log('   ^ Missing Access (bot doesn\'t have permission to view the channel)');
        } else if (error.code === 50013) {
            console.log('   ^ Missing Permissions (bot can\'t send messages/embeds in this channel)');
        }
    }

    process.exit(0);
}

testPostKillfeed().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
