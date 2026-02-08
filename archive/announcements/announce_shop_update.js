const Discord = require('discord.js');
const config = require('./config.json');

const bot = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES
    ]
});

// Hardcoded guild IDs
const guildIds = [
    '1386432422744162476', // Chernarus
    '1445943557020979274', // Livonia
    '1445957198000820316'  // Sakhal
];

bot.once('ready', async () => {
    console.log(`Logged in as ${bot.user.tag}`);
    
    try {
        const embed = new Discord.MessageEmbed()
            .setColor('#FF1493')
            .setTitle('⚔️ **THE ARMORY HAS BEEN RESTOCKED!** ⚔️')
            .setDescription(
                `**WARRIORS AND SURVIVORS, REJOICE!**\n\n` +
                `The gods have blessed Cupid's Divine Shop with a **LEGENDARY EXPANSION**!\n\n` +
                `**🎯 What Has Been Added:**`
            )
            .addFields(
                {
                    name: '🔫 **COMPLETE WEAPON ARSENAL** (30+ New Weapons)',
                    value: `**Assault Rifles:** M16A2, AK101, AK74, AKS-74U, AUG, FAMAS\n` +
                          `**Sniper Rifles:** CZ550, SSG82, Scout, VSS\n` +
                          `**Rifles:** SKS, Repeater, Ruger 10/22\n` +
                          `**Shotguns:** IZH-18, IZH-43, Saiga\n` +
                          `**SMGs:** PP-19, PM-73 RAK, CZ-61 Skorpion\n` +
                          `**Pistols:** Desert Eagle, CZ-75, P1, Ruger MK II\n` +
                          `**Plus all color variants!** (Black, Green, Camo, Wood)`,
                    inline: false
                },
                {
                    name: '🔭 **TACTICAL OPTICS** (23 New Scopes)',
                    value: `ACOG (4x & 6x) • Reflex • M68 • Kobra • Kashtan\n` +
                          `PSO-1/PSO-6/PSO-11 • PU Scope • Hunting Optics\n` +
                          `**Starlight Night Vision Scope** • Pistol Red Dots\n` +
                          `And many more for every weapon platform!`,
                    inline: false
                },
                {
                    name: '🔇 **SUPPRESSORS & COMPENSATORS**',
                    value: `AK Suppressor • M4 Suppressor • Pistol Suppressor\n` +
                          `Improvised Suppressor • MP5 Compensator • Mosin Compensator\n` +
                          `**Plus Bayonets:** AK, M9A1, Mosin, SKS`,
                    inline: false
                },
                {
                    name: '🎯 **WEAPON FURNITURE** (33 Attachments)',
                    value: `**Buttstocks:** AK Folding/Plastic/Wood • FAL Folding • M4 CQB/MP/OE\n` +
                          `**Handguards:** AK Rail/Wood • M4 RIS/MP • MP5 Rail\n` +
                          `**All with color variants!** (Black, Green, Tan, Camo)`,
                    inline: false
                },
                {
                    name: '💡 **TACTICAL LIGHTS & CAMOUFLAGE**',
                    value: `Weapon Flashlights • TLR Tactical Lights • Universal Lights\n` +
                          `**Ghillie Wraps:** Mossy, Tan, Winter, Woodland`,
                    inline: false
                },
                {
                    name: '📦 **COMPLETE MAGAZINE COLLECTION** (46 Magazines)',
                    value: `Every magazine for every weapon in the game!\n` +
                          `From 7-round 1911 mags to 75-round AKM drums!`,
                    inline: false
                },
                {
                    name: '📊 **THE NUMBERS**',
                    value: `🎖️ **240+ Total Items** now available!\n` +
                          `⚔️ **30+ New Weapons** with color variants\n` +
                          `🔧 **85+ Attachments** for full customization\n` +
                          `📌 **46 Magazines** for every situation`,
                    inline: false
                }
            )
            .addField(
                '🛒 **HOW TO ACCESS THE ARMORY**',
                `Type \`/shop\` to browse the complete catalog!\n` +
                `**Remember:** Use \`/imhere\` to mark your position before purchasing!\n` +
                `Items spawn at your location after the next server restart.`
            )
            .setFooter({ text: '🏹 Cupid has armed you for glory - now go forth and conquer! 🏹' })
            .setTimestamp();
        
        // Send to wop-general and general channels in each guild
        for (const guildId of guildIds) {
            try {
                const guild = await bot.guilds.fetch(guildId);
                const channels = guild.channels.cache.filter(ch => 
                    ch.name === 'wop-general' || 
                    ch.name === 'general' ||
                    ch.name === 'general-chat' ||
                    ch.name === '💬general' ||
                    ch.name === '💬-general'
                );
                
                if (channels.size === 0) {
                    console.log(`No wop-general or general channels found in ${guild.name}`);
                    console.log('Available channels:', guild.channels.cache.filter(ch => ch.type === 'GUILD_TEXT').map(ch => ch.name).join(', '));
                    continue;
                }
                
                for (const [channelId, channel] of channels) {
                    try {
                        await channel.send({
                            content: '@everyone',
                            embeds: [embed]
                        });
                        console.log(`✅ Announcement sent to #${channel.name} in ${guild.name}`);
                    } catch (err) {
                        console.error(`❌ Failed to send to #${channel.name}:`, err.message);
                    }
                }
                
            } catch (err) {
                console.error(`❌ Error processing guild ${guildId}:`, err.message);
            }
        }
        
        console.log('\n✅ All announcements sent!');
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
});

bot.login(config.TOKEN);