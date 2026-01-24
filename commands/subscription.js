const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subscription')
        .setDescription('View subscription status and upgrade options'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guildId;
        
        try {
            // Get subscription status
            const subscription = await db.getSubscription(guildId);
            
            if (!subscription) {
                // Should not happen after setup, but handle it
                await interaction.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ffaa00')
                            .setTitle('⚠️ No Subscription Found')
                            .setDescription('This server needs to run `/admin killfeed setup` first.')
                    ]
                });
                return;
            }
            
            const isPremium = subscription.plan_tier === 'premium' && subscription.status === 'active';
            const tierName = isPremium ? 'Premium' : 'Free';
            const tierColor = isPremium ? '#00ff99' : '#888888';
            const tierEmoji = isPremium ? '⭐' : '🆓';
            
            const embed = new MessageEmbed()
                .setColor(tierColor)
                .setTitle(`${tierEmoji} Subscription Status`)
                .setDescription(`**${tierName} Tier** - ${subscription.status}`)
                .setTimestamp();
            
            if (isPremium) {
                embed.addFields(
                    { 
                        name: '✨ Premium Features Active', 
                        value: 
                            '✅ Full shop system with item spawning\n' +
                            '✅ 30+ medieval mini-games\n' +
                            '✅ Bounty system\n' +
                            '✅ Base alert system\n' +
                            '✅ Trader system\n' +
                            '✅ Properties & achievements\n' +
                            '✅ Full economy features\n' +
                            '✅ Raid weekend scheduling\n' +
                            '✅ Teleport system\n' +
                            '✅ Auto-ban system (PVE mode)\n' +
                            '✅ Safe zone management',
                        inline: false 
                    }
                );
                
                // Show billing info if available
                if (subscription.current_period_end) {
                    const endDate = new Date(subscription.current_period_end);
                    embed.addField('📅 Billing Cycle', `Renews <t:${Math.floor(endDate.getTime() / 1000)}:R>`, false);
                }
                
                embed.setFooter({ text: 'Thank you for supporting the bot! 💖' });
            } else {
                // Free tier - show what they're missing
                embed.addFields(
                    { 
                        name: '🆓 Current Features', 
                        value: 
                            '✅ Killfeed system\n' +
                            '✅ K/D statistics\n' +
                            '✅ Leaderboards\n' +
                            '✅ Distance tracking\n' +
                            '✅ Basic economy (view balances)\n' +
                            '✅ Daily login rewards\n' +
                            '✅ 3 starter mini-games (fortune teller, labor, tavern dice)',
                        inline: false 
                    },
                    { 
                        name: '🔒 Upgrade to Premium ($5/month)', 
                        value: 
                            '**Unlock:**\n' +
                            '• Shop system with 406 items\n' +
                            '• 27+ additional mini-games\n' +
                            '• Bounty hunting system\n' +
                            '• Base proximity alerts\n' +
                            '• Player-run trader system\n' +
                            '• Properties & achievements\n' +
                            '• Full economy features\n' +
                            '• Advanced admin tools\n' +
                            '• And much more!\n\n' +
                            '**To Upgrade:** Contact the server owner',
                        inline: false 
                    }
                );
                
                embed.setFooter({ text: 'Support development by upgrading to Premium!' });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('[SUBSCRIPTION] Error:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while fetching subscription status.' 
            });
        }
    }
};
