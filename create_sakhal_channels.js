const { Client, Intents } = require('discord.js');
const config = require('./config.json');
const { pool } = require('./database');

async function createSakhalChannels() {
    const bot = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.MANAGE_CHANNELS
        ]
    });

    await bot.login(config.TOKEN);

    await new Promise(resolve => {
        bot.once('ready', () => {
            console.log(`✅ Bot logged in as ${bot.user.tag}\n`);
            resolve();
        });
    });

    const sakhalGuildId = '1445957198000820316';
    
    console.log('Creating channels for Sakhal...\n');
    
    try {
        const guild = await bot.guilds.fetch(sakhalGuildId);
        
        // Create buildlog channel
        const buildChannel = await guild.channels.create('🏗️-buildlog', {
            type: 'GUILD_TEXT',
            topic: 'DayZ build events (placed, raised, dismantled structures)'
        });
        console.log(`✅ Created buildlog channel: ${buildChannel.id}`);
        
        // Create suicidelog channel
        const suicideChannel = await guild.channels.create('💔-suicidelog', {
            type: 'GUILD_TEXT',
            topic: 'DayZ suicide events'
        });
        console.log(`✅ Created suicidelog channel: ${suicideChannel.id}`);
        
        // Update database
        await pool.query(`
            UPDATE guild_configs 
            SET build_channel_id = $1, suicide_channel_id = $2
            WHERE guild_id = $3
        `, [buildChannel.id, suicideChannel.id, sakhalGuildId]);
        
        console.log('\n✅ Sakhal channels created and configured!');
        console.log(`Build: ${buildChannel.id}`);
        console.log(`Suicide: ${suicideChannel.id}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
}

createSakhalChannels();
