require('dotenv').config();
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, Modal, MessageActionRow, TextInputComponent } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trader')
        .setDescription('Trader management commands (requires Trader role)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('open')
                .setDescription('Open your trader (requires Trader role)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close your trader (requires Trader role)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View all active traders')
        ),

    async execute(interaction) {
        // Premium feature check
        const guildId = interaction.guild.id;
        const isPremium = await db.isPremium(guildId);
        if (!isPremium) {
            const { MessageEmbed } = require('discord.js');
            const premiumEmbed = new MessageEmbed()
                .setColor('#ff5555')
                .setTitle('🔒 Premium Feature')
                .setDescription(
                    `**Trader System** is a premium feature!\n\n` +
                    `**Upgrade to Premium ($5/month) to unlock:**\n` +
                    `• Set up trader locations\n` +
                    `• Mark your trading hours\n` +
                    `• List all active traders\n` +
                    `• And all other premium features!\n\n` +
                    `*Contact the server owner to upgrade.*`
                )
                .setFooter({ text: 'Free tier: Killfeed, K/D, daily rewards, 3 mini-games' });
            await interaction.reply({ embeds: [premiumEmbed], ephemeral: true });
            return;
        }
        
        const subCommand = interaction.options.getSubcommand();

        switch (subCommand) {
            case 'open':
                await handleTraderOpen(interaction);
                break;
            case 'close':
                await handleTraderClose(interaction);
                break;
            case 'status':
                await handleTraderStatus(interaction);
                break;
        }
    }
};

async function handleTraderOpen(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    // Check for Trader role
    const member = await interaction.guild.members.fetch(userId);
    const hasTraderRole = member.roles.cache.some(role => role.name.toLowerCase() === 'trader');
    
    if (!hasTraderRole) {
        return interaction.reply({
            content: '❌ You need the **Trader** role to use this command!',
            ephemeral: true
        });
    }
    
    // Check if user already has an active trader
    const existingTrader = await db.query(
        'SELECT * FROM active_traders WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );
    
    if (existingTrader.rows.length > 0) {
        return interaction.reply({
            content: '❌ You already have an active trader! Close it first with `/trader close`',
            ephemeral: true
        });
    }
    
    // Show modal for location and hours
    const modal = new Modal()
        .setCustomId('trader_open_modal')
        .setTitle('Open Your Trader');
    
    const locationInput = new TextInputComponent()
        .setCustomId('location')
        .setLabel('Location (iZurvive coordinates)')
        .setStyle('SHORT')
        .setPlaceholder('Example: 6900.87 / 11430.08')
        .setRequired(true);
    
    const hoursInput = new TextInputComponent()
        .setCustomId('hours')
        .setLabel('Hours Open')
        .setStyle('SHORT')
        .setPlaceholder('Example: Open for 3 hours OR Open until 8:00 PM')
        .setRequired(true);
    
    const locationRow = new MessageActionRow().addComponents(locationInput);
    const hoursRow = new MessageActionRow().addComponents(hoursInput);
    
    modal.addComponents(locationRow, hoursRow);
    
    await interaction.showModal(modal);
}

async function handleTraderClose(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    // Check for Trader role
    const member = await interaction.guild.members.fetch(userId);
    const hasTraderRole = member.roles.cache.some(role => role.name.toLowerCase() === 'trader');
    
    if (!hasTraderRole) {
        return interaction.reply({
            content: '❌ You need the **Trader** role to use this command!',
            ephemeral: true
        });
    }
    
    // Check if user has an active trader
    const traderResult = await db.query(
        'SELECT * FROM active_traders WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );
    
    if (traderResult.rows.length === 0) {
        return interaction.reply({
            content: '❌ You don\'t have an active trader to close!',
            ephemeral: true
        });
    }
    
    const trader = traderResult.rows[0];
    
    // Reply first to acknowledge the interaction
    await interaction.reply({
        content: '✅ Closing your trader and sending announcement...',
        ephemeral: true
    });
    
    // Delete from database
    await db.query(
        'DELETE FROM active_traders WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );
    
    // Send closure announcement to general channel
    const generalChannel = interaction.guild.channels.cache.find(
        channel => channel.name.toLowerCase().includes('general') && channel.type === 'GUILD_TEXT'
    );
    
    if (generalChannel) {
        const closeEmbed = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle('🚫 TRADER CLOSED')
            .setDescription(`${interaction.user}'s trader has closed!`)
            .addFields(
                { name: '📍 Location', value: trader.location, inline: true },
                { name: '⏰ Was Open', value: trader.hours_open, inline: true }
            )
            .setFooter({ text: 'Use /trader status to see active traders' })
            .setTimestamp();
        
        await generalChannel.send({ content: '@everyone', embeds: [closeEmbed] });
    }
}

async function handleTraderStatus(interaction) {
    const guildId = interaction.guildId;
    
    // Get all active traders for this guild
    const tradersResult = await db.query(
        'SELECT * FROM active_traders WHERE guild_id = $1 ORDER BY opened_at ASC',
        [guildId]
    );
    
    if (tradersResult.rows.length === 0) {
        return interaction.reply({
            content: '📊 No active traders at this time!',
            ephemeral: true
        });
    }
    
    const statusEmbed = new MessageEmbed()
        .setColor('#00ff00')
        .setTitle(`📊 ACTIVE TRADERS (${tradersResult.rows.length})`)
        .setTimestamp();
    
    for (let i = 0; i < tradersResult.rows.length; i++) {
        const trader = tradersResult.rows[i];
        const user = await interaction.client.users.fetch(trader.user_id);
        const openedAt = new Date(trader.opened_at);
        const now = new Date();
        const minutesAgo = Math.floor((now - openedAt) / 1000 / 60);
        
        let timeAgoText;
        if (minutesAgo < 60) {
            timeAgoText = `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
        } else {
            const hoursAgo = Math.floor(minutesAgo / 60);
            timeAgoText = `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
        }
        
        statusEmbed.addField(
            `${i + 1}. ${user.username}'s Trader`,
            `📍 **Location:** ${trader.location}\n` +
            `⏰ **Hours:** ${trader.hours_open}\n` +
            `🕐 **Opened:** ${timeAgoText}`,
            false
        );
    }
    
    statusEmbed.setFooter({ text: 'Use /trader to open or close your trader' });
    
    await interaction.reply({ embeds: [statusEmbed] });
}
