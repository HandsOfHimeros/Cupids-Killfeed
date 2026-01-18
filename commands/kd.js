const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kd')
        .setDescription('View your kill/death statistics')
        .addUserOption(option =>
            option.setName('player')
                .setDescription('View another player\'s stats (leave empty for your own)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('playername')
                .setDescription('Search by in-game DayZ name')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('player');
            const playerName = interaction.options.getString('playername');
            const guildId = interaction.guild.id;

            // Determine what stats to fetch
            let stats;
            let displayName;

            if (playerName) {
                // Search by DayZ name
                stats = await db.query(`
                    SELECT * FROM player_stats 
                    WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2)
                `, [guildId, playerName]);

                displayName = playerName;
            } else {
                // Use Discord user (target or self)
                // Make sure we get the actual user who ran the command, not the bot
                const userId = targetUser ? targetUser.id : interaction.member.user.id;
                displayName = targetUser ? targetUser.username : interaction.member.user.username;

                // Get their DayZ name if set
                const dayzNameResult = await db.query(`
                    SELECT dayz_name FROM dayz_names WHERE user_id = $1
                `, [userId]);

                if (dayzNameResult.rows.length === 0) {
                    return interaction.reply({
                        content: `❌ ${displayName} hasn't linked their DayZ name yet. Use \`/setname\` to link your in-game name.`,
                        ephemeral: true
                    });
                }

                const dayzName = dayzNameResult.rows[0].dayz_name;

                // Get stats for that DayZ name
                stats = await db.query(`
                    SELECT * FROM player_stats 
                    WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2)
                `, [guildId, dayzName]);

                displayName = dayzName;
            }

            // If no stats found, create empty stats for display
            let playerStats;
            if (stats.rows.length === 0) {
                playerStats = {
                    kills: 0,
                    deaths: 0,
                    zombie_deaths: 0,
                    player_deaths: 0,
                    suicide_deaths: 0,
                    environmental_deaths: 0
                };
            } else {
                playerStats = stats.rows[0];
            }

            const kills = playerStats.kills || 0;
            const deaths = playerStats.deaths || 0;
            const zombieDeaths = playerStats.zombie_deaths || 0;
            const playerDeaths = playerStats.player_deaths || 0;
            const suicideDeaths = playerStats.suicide_deaths || 0;
            const environmentalDeaths = playerStats.environmental_deaths || 0;

            // Calculate K/D ratio
            const kdRatio = deaths === 0 ? kills.toFixed(2) : (kills / deaths).toFixed(2);

            // Determine if player is dishonored (deaths > kills)
            const isDishonored = deaths > kills;
            const embedColor = isDishonored ? '#8B0000' : '#00FF00'; // Dark red for shame, green for glory

            const embed = new MessageEmbed()
                .setColor(embedColor)
                .setTitle(`⚔️ BATTLE RECORD OF ${displayName.toUpperCase()} ⚔️`)
                .setTimestamp();

            // Main stats
            embed.addFields(
                { name: '🗡️ Kills', value: `\`${kills}\``, inline: true },
                { name: '💀 Deaths', value: `\`${deaths}\``, inline: true },
                { name: '📊 K/D Ratio', value: `\`${kdRatio}\``, inline: true }
            );

            // Death breakdown
            embed.addFields({
                name: '━━━━━━━━━━━━━━━━━━━━━━',
                value: '**DEATH TOLL BY CAUSE:**',
                inline: false
            });

            embed.addFields(
                { name: '🧟 Slain by Infected', value: `\`${zombieDeaths}\` deaths`, inline: true },
                { name: '⚔️ Slain by Warriors', value: `\`${playerDeaths}\` deaths`, inline: true },
                { name: '🪦 Other Perils', value: `\`${environmentalDeaths + suicideDeaths}\` deaths`, inline: true }
            );

            // Medieval shame/glory messages
            if (isDishonored) {
                const shameMessages = [];

                // Overall shame if deaths significantly exceed kills
                if (deaths > kills * 2) {
                    shameMessages.push(`⚠️ **THY K/D RATIO OF ${kdRatio} BRINGS DISHONOR TO THY HOUSE!**`);
                }

                // Zombie death shame
                if (zombieDeaths > 10) {
                    const zombieInsults = [
                        `🧟 **Thou hast been consumed by the plague ${zombieDeaths} times, peasant!**`,
                        `🧟 **The cursed undead have feasted upon thy flesh ${zombieDeaths} times!**`,
                        `🧟 **Thou art but fodder for the infected hordes! ${zombieDeaths} deaths to mindless beasts!**`,
                        `🧟 **The plague knows thee well, having claimed thee ${zombieDeaths} times!**`
                    ];
                    shameMessages.push(zombieInsults[Math.floor(Math.random() * zombieInsults.length)]);
                } else if (zombieDeaths > 5) {
                    shameMessages.push(`🧟 **The infected have bested thee ${zombieDeaths} times. Shameful!**`);
                }

                // Player death shame
                if (playerDeaths > 10) {
                    const pvpInsults = [
                        `⚔️ **Slain ${playerDeaths} times by thy fellow warriors - a pitiful display!**`,
                        `⚔️ **Thy combat prowess is that of a mere squire! ${playerDeaths} defeats!**`,
                        `⚔️ **The battlefield is not thy domain! ${playerDeaths} shameful defeats!**`,
                        `⚔️ **${playerDeaths} times has thou fallen in combat. Thou art but a serf!**`
                    ];
                    shameMessages.push(pvpInsults[Math.floor(Math.random() * pvpInsults.length)]);
                } else if (playerDeaths > 5) {
                    shameMessages.push(`⚔️ **Bested in combat ${playerDeaths} times. Dost thou even wield a blade?**`);
                }

                // General failure message
                if (shameMessages.length === 0 && deaths > kills) {
                    shameMessages.push(`💀 **The Grim Reaper knows thee well, for thou hast visited him ${deaths} times!**`);
                }

                // Add shame section
                if (shameMessages.length > 0) {
                    embed.addFields({
                        name: '━━━━━━━━━━━━━━━━━━━━━━',
                        value: shameMessages.join('\n\n'),
                        inline: false
                    });
                }
            } else if (kills > deaths && kills > 10) {
                // Glory messages for warriors
                const gloryMessages = [
                    `🏆 **A WORTHY WARRIOR WITH ${kills} KILLS!**`,
                    `⚔️ **THY BLADE HAS TASTED VICTORY ${kills} TIMES!**`,
                    `👑 **A TRUE CHAMPION OF THE BATTLEFIELD!**`,
                    `🛡️ **THY ENEMIES TREMBLE AT THY NAME!**`
                ];
                embed.addFields({
                    name: '━━━━━━━━━━━━━━━━━━━━━━',
                    value: gloryMessages[Math.floor(Math.random() * gloryMessages.length)],
                    inline: false
                });
            } else if (kills === 0 && deaths === 0) {
                // Encouraging message for brand new warriors
                const encouragementMessages = [
                    `⚔️ **A BLANK SLATE! THY LEGEND HAS YET TO BE WRITTEN!**\n🗡️ Go forth, brave warrior! The battlefield awaits thy first victory!\n🛡️ May thy blade strike true and thy enemies fall before thee!`,
                    `🏰 **FRESH FROM THE CASTLE WALLS, EH?**\n⚔️ Every great warrior must take their first step into battle!\n💪 The realm needs champions - will thou rise to glory or fall to obscurity?`,
                    `👑 **THY JOURNEY BEGINS NOW, ASPIRANT!**\n🗡️ Seize thy weapon and venture forth into the wastelands!\n🎯 Let thy first kill be the start of a legendary tale!`,
                    `⚔️ **UNTESTED IN BATTLE, BUT NOT WITHOUT HOPE!**\n🛡️ The greatest warriors all started with zero kills, brave soul!\n💀 Now go forth and claim thy rightful place in the halls of valor!`
                ];
                
                embed.addFields({
                    name: '━━━━━━━━━━━━━━━━━━━━━━',
                    value: encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)],
                    inline: false
                });
            } else if (kills === 0 && deaths > 0) {
                // Special message for those who have never killed
                embed.addFields({
                    name: '━━━━━━━━━━━━━━━━━━━━━━',
                    value: `⚠️ **THOU HAST NEVER DRAWN BLOOD IN COMBAT!**\n💀 **Yet thou hast perished ${deaths} times. Art thou lost, traveler?**`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in /kd command:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching stats. Please try again.',
                ephemeral: true
            });
        }
    }
};
