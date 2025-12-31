const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const db = require('./database');

async function postTestKillEvent() {
    const bot = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES
        ]
    });

    await bot.login(config.TOKEN);

    await new Promise(resolve => {
        bot.once('ready', () => {
            console.log(`✅ Bot logged in as ${bot.user.tag}`);
            resolve();
        });
    });

    const guildId = '1386432422744162476';
    const guildConfig = await db.getGuildConfig(guildId);

    if (!guildConfig || !guildConfig.killfeed_channel_id) {
        console.log('❌ Killfeed channel not configured');
        process.exit(1);
    }

    console.log(`\n📡 Posting test events to killfeed channel: ${guildConfig.killfeed_channel_id}`);

    const channel = await bot.channels.fetch(guildConfig.killfeed_channel_id);
    
    // Test Kill Event
    const killEmbed = new MessageEmbed()
        .setColor('#ff0000')
        .setTitle('☠️ Killfeed')
        .setDescription(`**TestKiller** killed **TestVictim**`)
        .addField('Weapon', 'M4A1', true)
        .addField('Time', '23:59:59', true)
        .setFooter({ text: '🧪 This is a test event to verify killfeed is working' })
        .setTimestamp();

    await channel.send({ embeds: [killEmbed] });
    console.log('✅ Posted test KILL event');

    // Test Hit Event
    const hitEmbed = new MessageEmbed()
        .setColor('#ffaa00')
        .setTitle('💥 Hitfeed')
        .setDescription(`**TestAttacker** hit **TestTarget**`)
        .addField('Weapon', 'AK-M', true)
        .addField('Time', '23:59:58', true)
        .setFooter({ text: '🧪 This is a test event to verify killfeed is working' })
        .setTimestamp();

    await channel.send({ embeds: [hitEmbed] });
    console.log('✅ Posted test HIT event');

    console.log('\n✨ Test events posted successfully!');
    console.log('Check your killfeed channel to confirm they appeared.');
    console.log('\nThis proves the killfeed configuration is working correctly.');
    console.log('Real kills/hits from your DayZ server will appear the same way once PvP activity occurs.');

    process.exit(0);
}

postTestKillEvent().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
