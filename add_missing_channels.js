// Add buildlog and suicidelog channels to existing configured guilds
const { Client, Intents, MessageEmbed } = require('discord.js');
const db = require('./database.js');

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

bot.once('ready', async () => {
    console.log('Bot ready, adding missing channels...');
    
    try {
        const guilds = await db.getAllGuildConfigs();
        
        for (const guildConfig of guilds) {
            const guild = await bot.guilds.fetch(guildConfig.guild_id);
            
            if (!guild) {
                console.log(`Guild ${guildConfig.guild_id} not found, skipping`);
                continue;
            }
            
            console.log(`\nProcessing guild: ${guild.name}`);
            
            let buildlogChannelId = guildConfig.buildlog_channel_id;
            let suicidelogChannelId = guildConfig.suicidelog_channel_id;
            let updated = false;
            
            // Create buildlog channel if missing
            if (!buildlogChannelId) {
                console.log('  Creating buildlog channel...');
                const buildlogChannel = await guild.channels.create('🏗️-buildlog', {
                    type: 'GUILD_TEXT',
                    permissionOverwrites: [{
                        id: guild.roles.everyone,
                        allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
                    }]
                });
                buildlogChannelId = buildlogChannel.id;
                console.log(`  ✅ Created buildlog channel: ${buildlogChannel.name}`);
                updated = true;
            } else {
                console.log('  ✅ Buildlog channel already exists');
            }
            
            // Create suicidelog channel if missing
            if (!suicidelogChannelId) {
                console.log('  Creating suicidelog channel...');
                const suicidelogChannel = await guild.channels.create('💔-suicidelog', {
                    type: 'GUILD_TEXT',
                    permissionOverwrites: [{
                        id: guild.roles.everyone,
                        allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
                    }]
                });
                suicidelogChannelId = suicidelogChannel.id;
                console.log(`  ✅ Created suicidelog channel: ${suicidelogChannel.name}`);
                updated = true;
            } else {
                console.log('  ✅ Suicidelog channel already exists');
            }
            
            // Update database if channels were created
            if (updated) {
                await db.setGuildChannels(guildConfig.guild_id, {
                    economyChannel: guildConfig.economy_channel_id,
                    shopChannel: guildConfig.shop_channel_id,
                    killfeedChannel: guildConfig.killfeed_channel_id,
                    connectionsChannel: guildConfig.connections_channel_id,
                    buildlogChannel: buildlogChannelId,
                    suicidelogChannel: suicidelogChannelId
                });
                console.log('  ✅ Database updated');
            }
        }
        
        console.log('\n✅ All guilds processed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
});

bot.login(process.env.DISCORD_TOKEN);
