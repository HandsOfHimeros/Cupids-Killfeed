const Discord = require('discord.js');
const db = require('./database.js');
require('dotenv').config();

const bot = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES
    ]
});

async function sendAnnouncement() {
    try {
        await bot.login(process.env.TOKEN);
        
        console.log('Bot logged in, fetching guilds...');
        
        // Get all configured guilds
        const guilds = await db.getAllGuildConfigs();
        console.log(`Found ${guilds.length} configured guilds`);
        
        for (const guildConfig of guilds) {
            try {
                const guild = await bot.guilds.fetch(guildConfig.guild_id);
                
                // Try to find general channel, otherwise use admin channel
                let targetChannel = null;
                
                // Look for a channel named "general" or similar
                const generalChannel = guild.channels.cache.find(ch => 
                    ch.name.toLowerCase().includes('general') || 
                    ch.name.toLowerCase().includes('announcement')
                );
                
                if (generalChannel) {
                    targetChannel = generalChannel;
                } else if (guildConfig.admin_channel_id) {
                    targetChannel = await guild.channels.fetch(guildConfig.admin_channel_id);
                }
                
                if (!targetChannel) {
                    console.log(`⚠️  No suitable channel found for guild ${guild.name}`);
                    continue;
                }
                
                const embed = new Discord.MessageEmbed()
                    .setColor('#FF1493')
                    .setTitle('⚔️ **HEED THIS CALL, SURVIVORS!** ⚔️')
                    .setDescription(`**Cupid's Divine Shop System Has Arrived!**\n\nThe gods have blessed this realm with a legendary economy system. Prove your worth on the battlefield and reap the rewards!`)
                    .addFields(
                        {
                            name: '🎯 **First - Mark Your Position!**',
                            value: `**CRITICAL:** Before purchasing from the shop, you **MUST** use the \`/imhere\` command!\n\n` +
                                  `Nitrado logs can take **up to 20 minutes** to update your location. Without using \`/imhere\`, ` +
                                  `your purchased items may spawn at the wrong location or not at all!\n\n` +
                                  `**Use \`/imhere\` to tell Cupid exactly where you stand on the battlefield!**`,
                            inline: false
                        },
                        {
                            name: '💰 **Earn Your Fortune**',
                            value: `• **Every Kill = 10 Coins** 💀\n` +
                                  `• Use \`/balance\` to check your wealth\n` +
                                  `• Use \`/bank\` to secure your fortune\n` +
                                  `• Use \`/leaderboard\` to see who dominates`,
                            inline: false
                        },
                        {
                            name: '🛒 **The Divine Armory**',
                            value: `• Use \`/shop\` to browse legendary gear\n` +
                                  `• Weapons, armor, medical supplies, and more\n` +
                                  `• Items spawn at **your location** after server restart\n` +
                                  `• **Remember: Use \`/imhere\` first!**`,
                            inline: false
                        },
                        {
                            name: '🏦 **Banking System**',
                            value: `• \`/deposit <amount>\` - Secure your coins from death\n` +
                                  `• \`/withdraw <amount>\` - Retrieve your savings\n` +
                                  `• Bank balance is **safe** even if you die!\n` +
                                  `• Wallet coins are **lost on death**`,
                            inline: false
                        },
                        {
                            name: '⏰ **Spawn Timing**',
                            value: `Purchased items spawn **after the next server restart**. Server restarts occur at:\n` +
                                  `**3:00 AM • 9:00 AM • 3:00 PM • 9:00 PM UTC**\n\n` +
                                  `Spawn cleanup happens 15-25 minutes after each restart.`,
                            inline: false
                        },
                        {
                            name: '⚡ **Command Quick Reference**',
                            value: `\`/imhere\` - Register your current position\n` +
                                  `\`/balance\` - Check wallet & bank\n` +
                                  `\`/shop\` - Browse items\n` +
                                  `\`/deposit\` \`/withdraw\` - Manage bank\n` +
                                  `\`/leaderboard\` - View top survivors`,
                            inline: false
                        }
                    )
                    .setFooter({ text: '🏹 May Cupid guide your aim and fill your pockets with gold! 🏹' })
                    .setTimestamp();
                
                await targetChannel.send({ 
                    content: '@everyone', 
                    embeds: [embed] 
                });
                
                console.log(`✅ Announcement sent to ${guild.name} (#${targetChannel.name})`);
                
                // Wait 2 seconds between messages to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error sending to guild ${guildConfig.guild_id}:`, error.message);
            }
        }
        
        console.log('\n✅ All announcements sent!');
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

sendAnnouncement();
