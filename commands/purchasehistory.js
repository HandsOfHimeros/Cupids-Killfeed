const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purchasehistory')
        .setDescription('View purchase history and spawn status')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('View your purchase history')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of purchases to show')
                        .setMinValue(1)
                        .setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('failed')
                .setDescription('View failed spawns (Admin only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('View all recent purchases (Admin only)')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of purchases to show')
                        .setMinValue(1)
                        .setMaxValue(100))),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'me') {
                const limit = interaction.options.getInteger('limit') || 10;
                const history = await db.getPurchaseHistory(guildId, userId, limit);

                if (history.length === 0) {
                    return await interaction.reply({
                        content: '❌ No purchase history found.',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('📦 Your Purchase History')
                    .setDescription(`Showing last ${history.length} purchases`);

                for (const purchase of history) {
                    const date = new Date(parseInt(purchase.purchase_timestamp));
                    const status = purchase.spawn_success === true ? '✅ Spawned' :
                                  purchase.spawn_success === false ? '❌ Failed' :
                                  purchase.spawn_attempted ? '⏳ Attempted' : '⏸️ Pending';
                    
                    const coords = purchase.spawn_coordinates || 'N/A';
                    const error = purchase.spawn_error ? `\nError: ${purchase.spawn_error}` : '';

                    embed.addFields({
                        name: `${purchase.item_name} (x${purchase.quantity})`,
                        value: `Status: ${status}\nCost: $${purchase.total_cost}\nClass: \`${purchase.item_class}\`\nCoords: ${coords}\nDate: ${date.toLocaleString()}${error}`,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'failed') {
                // Admin check
                if (!interaction.member.permissions.has('Administrator')) {
                    return await interaction.reply({
                        content: '❌ This command requires Administrator permission.',
                        ephemeral: true
                    });
                }

                const failed = await db.getFailedSpawns(guildId, 20);

                if (failed.length === 0) {
                    return await interaction.reply({
                        content: '✅ No failed spawns found!',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Failed Spawns')
                    .setDescription(`Found ${failed.length} failed spawn attempts`);

                for (const purchase of failed) {
                    const date = new Date(parseInt(purchase.purchase_timestamp));
                    const error = purchase.spawn_error || 'Unknown error';

                    embed.addFields({
                        name: `${purchase.item_name} (x${purchase.quantity}) - ${purchase.dayz_player_name}`,
                        value: `Class: \`${purchase.item_class}\`\nError: ${error}\nDate: ${date.toLocaleString()}`,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'all') {
                // Admin check
                if (!interaction.member.permissions.has('Administrator')) {
                    return await interaction.reply({
                        content: '❌ This command requires Administrator permission.',
                        ephemeral: true
                    });
                }

                const limit = interaction.options.getInteger('limit') || 20;
                const history = await db.getPurchaseHistory(guildId, null, limit);

                if (history.length === 0) {
                    return await interaction.reply({
                        content: '❌ No purchase history found.',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📦 All Recent Purchases')
                    .setDescription(`Showing last ${history.length} purchases`);

                for (const purchase of history) {
                    const date = new Date(parseInt(purchase.purchase_timestamp));
                    const status = purchase.spawn_success === true ? '✅' :
                                  purchase.spawn_success === false ? '❌' :
                                  purchase.spawn_attempted ? '⏳' : '⏸️';
                    
                    embed.addFields({
                        name: `${status} ${purchase.item_name} (x${purchase.quantity})`,
                        value: `Player: ${purchase.dayz_player_name}\nClass: \`${purchase.item_class}\`\nDate: ${date.toLocaleString()}`,
                        inline: true
                    });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('[PURCHASE HISTORY] Error:', error);
            await interaction.reply({
                content: '❌ Error retrieving purchase history: ' + error.message,
                ephemeral: true
            });
        }
    }
};
