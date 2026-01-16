const { Client, Intents, MessageEmbed } = require('discord.js');
const db = require('./database.js');
require('dotenv').config();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        // Get all configured guilds
        const guilds = await db.getAllGuildConfigs();
        console.log(`Found ${guilds.length} configured guilds`);
        
        for (const guildConfig of guilds) {
            try {
                const guild = await client.guilds.fetch(guildConfig.guild_id);
                
                // Look for general channel
                const generalChannel = guild.channels.cache.find(ch => 
                    ch.name.toLowerCase().includes('general') || 
                    ch.name.toLowerCase().includes('announcement') ||
                    ch.name === 'wop-general'
                );
                
                if (!generalChannel) {
                    console.log(`⚠️  No general channel found for guild ${guild.name}`);
                    continue;
                }
                
                const embed = new MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle('⚡ **DIVINE PROCLAMATION FROM THE HEAVENS** ⚡')
                    .setDescription(
                        `@everyone\n\n` +
                        `**HEAR YE, WARRIORS OF THE WASTELAND!**\n\n` +
                        `*The gods have witnessed your struggles. They have heard your cries in the darkness. ` +
                        `And now, from the celestial forge of Olympus itself, a gift beyond mortal comprehension...*\n\n` +
                        `🏹 **CUPID'S DIVINE SHOP HAS TRANSCENDED!** 🏹`
                    )
                    .addFields(
                        {
                            name: '✨ **THE MIRACLE OF THE SACRED TABLES** ✨',
                            value: 
                                `No longer shall your treasures scatter across the realm like fallen stars!\n\n` +
                                `**Behold the power of divine manifestation:**\n` +
                                `• Your purchased gear now **materializes on SACRED TABLES**\n` +
                                `• Tables spawn **within 5 meters** of your hallowed position\n` +
                                `• Multiple purchases? They **accumulate in glorious grids** upon a single altar\n` +
                                `• The gods organize your spoils with **celestial precision**\n\n` +
                                `*This is not mere commerce—this is DIVINE INTERVENTION!*`,
                            inline: false
                        },
                        {
                            name: '⚔️ **HOW TO INVOKE THE BLESSING** ⚔️',
                            value:
                                `**Step 1:** Use \`/imhere\` to mark your sacred ground\n` +
                                `**Step 2:** Browse Cupid's arsenal with \`/shop\`\n` +
                                `**Step 3:** Purchase your legendary gear\n` +
                                `**Step 4:** Wait for the server's divine restart\n` +
                                `**Step 5:** Witness the **LOBBY TABLE** manifest with your bounty!`,
                            inline: false
                        },
                        {
                            name: '🌟 **THE POWER YOU NOW COMMAND** 🌟',
                            value:
                                `📦 **406 LEGENDARY ITEMS** across 15 categories\n` +
                                `🎯 **ASSAULT RIFLES • SNIPERS • SHOTGUNS**\n` +
                                `🗡️ **MELEE WEAPONS • ATTACHMENTS • AMMUNITION**\n` +
                                `💊 **MEDICAL SUPPLIES • FOOD & DRINK**\n` +
                                `🎒 **CLOTHING • ARMOR • BACKPACKS**\n` +
                                `🔧 **TOOLS • BUILDING • VEHICLES • ELECTRONICS**\n\n` +
                                `*Every item meticulously catalogued. Every template perfected.*`,
                            inline: false
                        },
                        {
                            name: '💰 **EARN YOUR GLORY** 💰',
                            value:
                                `• **10 COINS PER KILL** - The blood price of power\n` +
                                `• \`/balance\` - Witness your accumulated wealth\n` +
                                `• \`/bank\` - Secure your fortune from death's grasp\n` +
                                `• \`/leaderboard\` - See who stands among legends\n\n` +
                                `*Every kill brings you closer to godhood!*`,
                            inline: false
                        },
                        {
                            name: '🔥 **THE SACRED RESTART TIMES** 🔥',
                            value:
                                `Your divine purchases manifest when the servers commune with the gods:\n\n` +
                                `⏰ **3:00 AM** • **9:00 AM** • **3:00 PM** • **9:00 PM** UTC\n\n` +
                                `*Patience, warrior. Even gods respect the cosmic cycle.*`,
                            inline: false
                        },
                        {
                            name: '⚡ **COMMAND THE DIVINE** ⚡',
                            value:
                                `\`/imhere\` - **CRITICAL!** Mark your position before all else\n` +
                                `\`/shop\` - Behold 406 items of legend\n` +
                                `\`/balance\` - Know your power\n` +
                                `\`/deposit\` \`/withdraw\` - Master your fortune\n` +
                                `\`/leaderboard\` - Witness greatness`,
                            inline: false
                        }
                    )
                    .setFooter({ 
                        text: '🏹 By Cupid\'s arrow and Himeros\' fire, may your tables overflow with glory! 🔥'
                    })
                    .setTimestamp();
                
                await generalChannel.send({ embeds: [embed] });
                console.log(`✅ Announcement sent to ${guild.name} (${generalChannel.name})`);
                
                // Small delay between servers
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error sending to guild ${guildConfig.guild_id}:`, error.message);
            }
        }
        
        console.log('\n🎉 All announcements sent! The realm has been notified of the divine gift!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
    
    process.exit(0);
});

client.login(process.env.TOKEN);
