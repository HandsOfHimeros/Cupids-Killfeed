const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subscribe')
        .setDescription('Upgrade to Premium - Unlock all features!'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guildId;
        
        try {
            // Check current subscription
            const subscription = await db.getSubscription(guildId);
            const isPremium = subscription?.plan_tier === 'premium' && subscription?.status === 'active';
            
            if (isPremium) {
                // Already premium
                await interaction.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setColor('#00ff99')
                            .setTitle('⭐ Already Premium!')
                            .setDescription('This server already has Premium access to all features.')
                            .addField('✨ Active Features', 
                                '• Full shop system (406 items)\n' +
                                '• 30+ medieval mini-games\n' +
                                '• Bounty system\n' +
                                '• Base alerts & trader system\n' +
                                '• Properties & achievements\n' +
                                '• Advanced admin tools\n' +
                                '• And much more!')
                            .setFooter({ text: 'Thank you for your support! 💖' })
                    ]
                });
                return;
            }
            
            // Show upgrade information
            const embed = new MessageEmbed()
                .setColor('#FFD700')
                .setTitle('⭐ Upgrade to Premium!')
                .setDescription(
                    '**Unlock the full power of Cupid\'s Killfeed Bot!**\n\n' +
                    '💰 **Price: $5/month**'
                )
                .addFields(
                    {
                        name: '✨ Premium Features',
                        value:
                            '🛒 **Shop System** - 406 items across 15 categories\n' +
                            '🎮 **30+ Mini-Games** - Medieval economy system\n' +
                            '🎯 **Bounty System** - Place & claim bounties\n' +
                            '🏰 **Base Alerts** - Proximity notifications\n' +
                            '🤝 **Trader System** - Player-run trading posts\n' +
                            '🏡 **Properties** - Income-generating buildings\n' +
                            '🏆 **Achievements** - Unlock rewards\n' +
                            '⚔️ **Raid Weekend** - Auto-scheduling\n' +
                            '🚁 **Teleport System** - Admin teleport zones\n' +
                            '🔒 **Auto-Ban** - PVE mode with PVP zones\n' +
                            '🛡️ **Safe Zones** - Zone management\n' +
                            '⚙️ **Admin Tools** - Advanced configuration',
                        inline: false
                    },
                    {
                        name: '🆓 What You Keep (Free)',
                        value:
                            '• Killfeed system\n' +
                            '• K/D statistics & leaderboards\n' +
                            '• Distance tracking\n' +
                            '• Basic economy features\n' +
                            '• Daily login rewards\n' +
                            '• 3 starter mini-games',
                        inline: false
                    },
                    {
                        name: '💳 How to Subscribe',
                        value:
                            '**Server owners/admins only:**\n' +
                            '1. Contact the bot developer for payment details\n' +
                            '2. Set up monthly billing ($5/month)\n' +
                            '3. Your server will be upgraded within 24 hours\n\n' +
                            '**Support:** Contact <@YOUR_DISCORD_ID> for subscription setup\n\n' +
                            '⚡ *Stripe integration coming soon for instant upgrades!*',
                        inline: false
                    }
                )
                .setFooter({ text: 'Premium proceeds support bot development and hosting 💖' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('[SUBSCRIBE] Error:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred. Please try again later.' 
            });
        }
    }
};
