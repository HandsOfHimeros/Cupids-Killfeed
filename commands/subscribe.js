const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const db = require('../database');
const { createCheckoutSession, createPortalSession } = require('../stripe_checkout');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subscribe')
        .setDescription('Upgrade to Premium - Unlock all features!'),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }
        
        const guildId = interaction.guildId;
        
        try {
            // Check current subscription
            const subscription = await db.getSubscription(guildId);
            const isPremium = subscription?.plan_tier === 'premium' && subscription?.status === 'active';
            
            if (isPremium) {
                // Already premium - show manage subscription option
                const embed = new MessageEmbed()
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
                    .setFooter({ text: 'Thank you for your support! 💖' });
                
                // If they have a Stripe customer ID, offer portal access
                const components = [];
                if (subscription.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
                    try {
                        const portalUrl = await createPortalSession(subscription.stripe_customer_id, guildId);
                        const row = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setLabel('Manage Subscription')
                                    .setStyle('LINK')
                                    .setURL(portalUrl)
                                    .setEmoji('⚙️')
                            );
                        components.push(row);
                    } catch (err) {
                        console.error('[SUBSCRIBE] Error creating portal session:', err);
                    }
                }
                
                await interaction.editReply({ embeds: [embed], components });
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
                            '⚙️Click the button below to upgrade instantly!**\n\n' +
                            '✅ Secure checkout via Stripe\n' +
                            '✅ Instant access after payment\n' +
                            '✅ Cancel anytime\n\n' +
                            '*Server owners/admins only*',
                        inline: false
                    }
                )
                .setFooter({ text: 'Premium proceeds support bot development and hosting 💖' })
                .setTimestamp();
            
            // Create checkout button
            const components = [];
            
            // Only show Stripe button if configured
            if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID) {
                try {
                    const checkoutUrl = await createCheckoutSession(
                        guildId, 
                        interaction.guild.name,
                        null // Could add user email if needed
                    );
                    
                    const row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('Upgrade to Premium - $5/month')
                                .setStyle('LINK')
                                .setURL(checkoutUrl)
                                .setEmoji('⭐')
                        );
                    components.push(row);
                } catch (err) {
                    console.error('[SUBSCRIBE] Error creating checkout session:', err);
                    // Fallback message
                    embed.addField('⚠️ Stripe Error', 
                        'Automatic checkout is temporarily unavailable. Please contact support.',
                        false
                    );
                }
            } else {
                // Stripe not configured - show manual process
                embed.fields[2].value = 
                    '**Server owners/admins only:**\n' +
                    '1. Contact the bot developer for payment details\n' +
                    '2. Set up monthly billing ($5/month)\n' +
                    '3. Your server will be upgraded within 24 hours\n\n' +
                    '**Support:** Contact the bot developer for subscription setup';
            }
            
            await interaction.editReply({ embeds: [embed], components
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
