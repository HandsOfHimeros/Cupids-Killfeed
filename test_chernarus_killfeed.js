const { Client, Intents, MessageEmbed } = require('discord.js');
const { Pool } = require('pg');

const bot = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES
    ] 
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

bot.once('ready', async () => {
    console.log('✅ Bot logged in as', bot.user.tag);
    
    try {
        // Get Chernarus config
        const result = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', ['1386432422744162476']);
        const guildConfig = result.rows[0];
        
        console.log('📋 Chernarus Configuration:');
        console.log('Killfeed Channel:', guildConfig.killfeed_channel_id);
        console.log('');
        
        // Create test kill event
        const testEvent = {
            type: 'kill',
            time: new Date().toTimeString().split(' ')[0].substring(0, 8),
            killer: 'TestKiller',
            victim: 'TestVictim',
            weapon: 'M4A1'
        };
        
        console.log('🔫 Posting test kill event to Chernarus killfeed...');
        
        const channel = await bot.channels.fetch(guildConfig.killfeed_channel_id);
        if (!channel) {
            console.error('❌ Could not find killfeed channel');
            process.exit(1);
        }
        
        const embed = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle('☠️ Killfeed')
            .setDescription(`**${testEvent.killer}** killed **${testEvent.victim}**`)
            .addField('Weapon', testEvent.weapon, true)
            .addField('Time', testEvent.time, true)
            .setTimestamp()
            .setFooter({ text: 'TEST EVENT' });
        
        await channel.send({ embeds: [embed] });
        console.log('✅ Test kill event posted successfully!');
        
        await pool.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
});

bot.login(process.env.TOKEN);
