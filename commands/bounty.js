const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const db = require('../database.js');

const MINIMUM_BOUNTY = 5000;
const PLACEMENT_FEE_PERCENT = 10;
const BOUNTY_EXPIRATION_DAYS = 7;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bounty')
        .setDescription('Bounty system - place and manage bounties on players')
        .addSubcommand(subcommand =>
            subcommand
                .setName('place')
                .setDescription('Place a bounty on a player')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('The Discord user to place a bounty on')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription(`Bounty amount (minimum $${MINIMUM_BOUNTY.toLocaleString()})`)
                        .setRequired(true)
                        .setMinValue(MINIMUM_BOUNTY))
                .addBooleanOption(option =>
                    option
                        .setName('anonymous')
                        .setDescription('Hide your identity (costs extra 10% fee)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all active bounties (most wanted)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Check bounties on a specific player')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('The player to check bounties for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel one of your active bounties')
                .addIntegerOption(option =>
                    option
                        .setName('bounty_id')
                        .setDescription('The ID of the bounty to cancel (use /bounty mybounties to see IDs)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mybounties')
                .setDescription('View your active bounties')),

    async execute(interaction) {
        // Defer immediately to prevent timeout during database operations
        await interaction.deferReply({ ephemeral: true });
        
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'place') {
                await handlePlaceBounty(interaction);
            } else if (subcommand === 'list') {
                await handleListBounties(interaction);
            } else if (subcommand === 'info') {
                await handleBountyInfo(interaction);
            } else if (subcommand === 'cancel') {
                await handleCancelBounty(interaction);
            } else if (subcommand === 'mybounties') {
                await handleMyBounties(interaction);
            }
        } catch (error) {
            console.error('[BOUNTY] Command error:', error);
            try {
                await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
            } catch (replyError) {
                console.error('[BOUNTY] Failed to send error message:', replyError.message);
            }
        }
    }
};

async function handlePlaceBounty(interaction) {
    console.log('[BOUNTY] handlePlaceBounty called');
    
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');
    const anonymous = interaction.options.getBoolean('anonymous') || false;
    const guildId = interaction.guild.id;
    const placerId = interaction.user.id;

    console.log('[BOUNTY] Target:', target.username, 'Amount:', amount, 'Anonymous:', anonymous);

    // Can't place bounty on yourself
    if (target.id === placerId) {
        console.log('[BOUNTY] Self-bounty attempt blocked');
        return interaction.editReply('❌ You cannot place a bounty on yourself!');
    }

    // Can't place bounty on a bot
    if (target.bot) {
        return interaction.editReply('❌ You cannot place a bounty on a bot!');
    }

    // Check if target has a DayZ name linked
    console.log('[BOUNTY] Checking target DayZ name...');
    const targetDayzName = await db.getDayZName(guildId, target.id);
    console.log('[BOUNTY] Target DayZ name:', targetDayzName);
    if (!targetDayzName) {
        return interaction.editReply(`❌ ${target.username} has not linked their DayZ name yet. They need to use \`/setname\` first.`);
    }

    // Calculate total cost (amount + placement fee)
    const feePercent = anonymous ? PLACEMENT_FEE_PERCENT * 2 : PLACEMENT_FEE_PERCENT;
    const placementFee = Math.floor(amount * (feePercent / 100));
    const totalCost = amount + placementFee;
    console.log('[BOUNTY] Cost calculation - Amount:', amount, 'Fee:', placementFee, 'Total:', totalCost);

    // Check placer's balance
    const placerBalance = await db.getBalance(guildId, placerId);
    console.log('[BOUNTY] Placer balance:', placerBalance, 'Required:', totalCost);
    if (placerBalance < totalCost) {
        return interaction.editReply(
            `❌ Insufficient funds!\n` +
            `Bounty: $${amount.toLocaleString()}\n` +
            `Fee (${feePercent}%): $${placementFee.toLocaleString()}\n` +
            `Total: $${totalCost.toLocaleString()}\n` +
            `Your balance: $${placerBalance.toLocaleString()}\n` +
            `Need: $${(totalCost - placerBalance).toLocaleString()} more`
        );
    }

    // Deduct the total cost
    console.log('[BOUNTY] Deducting', -totalCost, 'from balance...');
    await db.addBalance(guildId, placerId, -totalCost);

    // Create the bounty
    console.log('[BOUNTY] Creating bounty in database...');
    const bounty = await db.createBounty(
        guildId,
        placerId,
        target.id,
        targetDayzName,
        amount,
        anonymous,
        BOUNTY_EXPIRATION_DAYS
    );
    console.log('[BOUNTY] Bounty created with ID:', bounty.id);
    console.log('[BOUNTY] Bounty expires_at:', bounty.expires_at, 'Type:', typeof bounty.expires_at);
    console.log('[BOUNTY] Target:', target.id, 'Name:', targetDayzName);
    console.log('[BOUNTY] Amount:', amount, 'Fee:', placementFee);

    // Send confirmation to placer (ephemeral)
    const confirmEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Bounty Placed!')
        .setDescription(`You placed a **$${amount.toLocaleString()}** bounty on **${targetDayzName}**`);

    try {
        confirmEmbed.addFields([
            { name: 'Target', value: `<@${target.id}> (${targetDayzName})`, inline: true },
            { name: 'Amount', value: `$${amount.toLocaleString()}`, inline: true },
            { name: 'Fee Paid', value: `$${placementFee.toLocaleString()}`, inline: true },
            { name: 'Anonymous', value: anonymous ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Expires', value: `<t:${Math.floor(new Date(bounty.expires_at).getTime() / 1000).toString()}:R>`, inline: true },
            { name: 'Bounty ID', value: `#${bounty.id.toString()}`, inline: true }
        ]);
    } catch (fieldError) {
        console.error('[BOUNTY] Error adding fields:', fieldError);
        throw fieldError;
    }
    
    // Add PVE server notice if applicable
    const guildConfig = await db.getGuildConfig(guildId);
    let footerText = 'Bounty will auto-claim when target is killed';
    if (guildConfig?.auto_ban_on_kill) {
        footerText += ' (PVE Server: Kill must happen in a PVP zone)';
    }
    
    confirmEmbed
        .setFooter({ text: footerText })
        .setTimestamp();

    // Debug: Log embed structure before sending
    const embedData = confirmEmbed.toJSON();
    console.log('[BOUNTY] Embed data:', JSON.stringify(embedData, null, 2));
    console.log('[BOUNTY] Description value:', embedData.description);
    console.log('[BOUNTY] Description type:', typeof embedData.description);
    console.log('[BOUNTY] Description length:', embedData.description?.length);

    // Send as plain object to avoid Discord.js v13 EmbedBuilder issue
    await interaction.editReply({ embeds: [embedData] });

    // Post public announcement (if not anonymous or if server wants public announcements)
    const killfeedChannel = interaction.guild.channels.cache.get(guildConfig?.killfeed_channel_id);
    
    if (killfeedChannel) {
        const publicEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('💀 BOUNTY PLACED')
            .setDescription(`A bounty has been placed on **${targetDayzName}**!`)
            .addFields([
                { name: '💰 Reward', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '🎯 Target', value: targetDayzName, inline: true },
                { name: '⏰ Expires', value: `<t:${Math.floor(new Date(bounty.expires_at).getTime() / 1000).toString()}:R>`, inline: true }
            ]);

        if (!anonymous) {
            publicEmbed.addFields([{ name: '👤 Placed By', value: `<@${interaction.user.id}>`, inline: true }]);
        }

        let publicFooterText = 'Kill this player to claim the bounty!';
        if (guildConfig?.auto_ban_on_kill) {
            publicFooterText += ' (PVE Server: Must kill in PVP zone)';
        }
        
        publicEmbed.setFooter({ text: publicFooterText });
        publicEmbed.setTimestamp();

        const publicEmbedData = publicEmbed.toJSON();
        await killfeedChannel.send({ embeds: [publicEmbedData] });
    }
}

async function handleListBounties(interaction) {
    const guildId = interaction.guild.id;
    const bounties = await db.getAllActiveBounties(guildId);

    if (bounties.length === 0) {
        return interaction.editReply('📋 No active bounties at this time.');
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 MOST WANTED')
        .setDescription('Active bounties on the server:')
        .setTimestamp();

    let description = '';
    for (let i = 0; i < Math.min(bounties.length, 10); i++) {
        const bounty = bounties[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        description += `${medal} **${bounty.target_dayz_name}** - $${parseInt(bounty.total_bounty).toLocaleString()}`;
        if (bounty.bounty_count > 1) {
            description += ` (${bounty.bounty_count} bounties)`;
        }
        description += '\n';
    }

    embed.setDescription(description);
    embed.setFooter({ text: `Total: ${bounties.length} players wanted | Kill them to claim bounties!` });

    const embedData = embed.toJSON();
    await interaction.editReply({ embeds: [embedData] });
}

async function handleBountyInfo(interaction) {
    const target = interaction.options.getUser('target');
    const guildId = interaction.guild.id;

    const targetDayzName = await db.getDayZName(guildId, target.id);
    if (!targetDayzName) {
        return interaction.editReply(`❌ ${target.username} has not linked their DayZ name yet.`);
    }

    const bounties = await db.getActiveBountiesForTarget(guildId, targetDayzName);

    if (bounties.length === 0) {
        return interaction.editReply(`📋 No active bounties on **${targetDayzName}**.`);
    }

    const totalBounty = bounties.reduce((sum, b) => sum + b.amount, 0);

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`🎯 Bounties on ${targetDayzName}`)
        .setDescription(`There ${bounties.length === 1 ? 'is' : 'are'} **${bounties.length}** active ${bounties.length === 1 ? 'bounty' : 'bounties'} on this player.`)
        .addFields([
            { name: '💰 Total Bounty', value: `$${totalBounty.toLocaleString()}`, inline: true },
            { name: '📊 Number of Bounties', value: `${bounties.length}`, inline: true }
        ])
        .setTimestamp();

    if (bounties.length <= 5) {
        let details = '';
        for (const bounty of bounties) {
            const placedBy = bounty.anonymous ? '👤 Anonymous' : `<@${bounty.placer_user_id}>`;
            const expiresTimestamp = Math.floor(new Date(bounty.expires_at).getTime() / 1000);
            details += `• $${bounty.amount.toLocaleString()} by ${placedBy} (expires <t:${expiresTimestamp}:R>)\n`;
        }
        embed.addFields({ name: 'Bounty Details', value: details, inline: false });
    }

    embed.setFooter({ text: 'Kill this player to claim all bounties!' });

    const embedData = embed.toJSON();
    await interaction.editReply({ embeds: [embedData] });
}

async function handleCancelBounty(interaction) {
    const bountyId = interaction.options.getInteger('bounty_id');
    const userId = interaction.user.id;

    const cancelledBounty = await db.cancelBounty(bountyId, userId);

    if (!cancelledBounty) {
        return interaction.editReply('❌ Bounty not found or you do not have permission to cancel it.');
    }

    // Refund 90% of the bounty amount (lose the 10% fee)
    const refundAmount = Math.floor(cancelledBounty.amount * 0.9);
    await db.addBalance(interaction.guild.id, userId, refundAmount);

    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🚫 Bounty Cancelled')
        .setDescription(`Bounty #${bountyId} on **${cancelledBounty.target_dayz_name}** has been cancelled.`)
        .addFields(
            { name: 'Original Amount', value: `$${cancelledBounty.amount.toLocaleString()}`, inline: true },
            { name: 'Refunded', value: `$${refundAmount.toLocaleString()}`, inline: true },
            { name: 'Fee Lost', value: `$${(cancelledBounty.amount - refundAmount).toLocaleString()}`, inline: true }
        )
        .setTimestamp();

    const embedData = embed.toJSON();
    await interaction.editReply({ embeds: [embedData] });
}

async function handleMyBounties(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const bounties = await db.getUserActiveBounties(guildId, userId);

    if (bounties.length === 0) {
        return interaction.editReply('📋 You have no active bounties.');
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Your Active Bounties')
        .setDescription(`You have ${bounties.length} active bounty(ies):`)
        .setTimestamp();

    let description = '';
    let totalAmount = 0;

    for (const bounty of bounties) {
        totalAmount += bounty.amount;
        const expiresTimestamp = Math.floor(new Date(bounty.expires_at).getTime() / 1000);
        description += `**#${bounty.id}** - ${bounty.target_dayz_name}: $${bounty.amount.toLocaleString()} (expires <t:${expiresTimestamp}:R>)\n`;
    }

    embed.setDescription(description);
    embed.addFields([{ name: 'Total Amount in Bounties', value: `$${totalAmount.toLocaleString()}`, inline: false }]);
    embed.setFooter({ text: 'Use /bounty cancel <id> to cancel a bounty (90% refund)' });

    const embedData = embed.toJSON();
    await interaction.editReply({ embeds: [embedData] });
}
