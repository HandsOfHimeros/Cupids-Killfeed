// DEV TEST COMMAND - Only works in development mode
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('devtest')
        .setDescription('🧪 Test command for development bot')
        .addStringOption(option =>
            option.setName('feature')
                .setDescription('Feature to test')
                .setRequired(false)
                .addChoices(
                    { name: 'Database Connection', value: 'db' },
                    { name: 'Kit System', value: 'kit' },
                    { name: 'Subscription Tiers', value: 'sub' },
                    { name: 'Bot Info', value: 'info' }
                )
        ),

    async execute(interaction) {
        // Only allow in dev mode or test server
        const isDev = process.env.DEV_MODE === 'true';
        const testGuildId = process.env.TEST_GUILD_ID;
        
        if (!isDev && interaction.guildId !== testGuildId) {
            return interaction.reply({ 
                content: '❌ This command is only available in development mode.', 
                ephemeral: true 
            });
        }

        const feature = interaction.options.getString('feature') || 'info';

        const embed = new MessageEmbed()
            .setColor('#00ff00')
            .setTitle('🧪 Development Test Results')
            .setTimestamp();

        switch (feature) {
            case 'db':
                const db = require('../database.js');
                try {
                    const result = await db.query('SELECT NOW()');
                    embed.addField('✅ Database', `Connected successfully\nTimestamp: ${result.rows[0].now}`);
                } catch (err) {
                    embed.addField('❌ Database', `Error: ${err.message}`);
                }
                break;

            case 'kit':
                const kits = require('../weapon_kits.js');
                const kitCount = Object.keys(kits).length;
                const kitNames = Object.values(kits).map(k => k.name).join('\n');
                embed.addField('✅ Kit System', `Loaded ${kitCount} weapon kits:\n${kitNames}`);
                break;

            case 'sub':
                embed.addField('🔧 Subscription System', 'Not yet implemented - Coming soon!');
                embed.addField('Planned Tiers', '🆓 Free\n💵 Economy ($5)\n👑 Full Suite ($10)');
                break;

            case 'info':
            default:
                embed.addField('🤖 Bot Mode', config.DEV_MODE ? 'DEVELOPMENT' : 'PRODUCTION');
                embed.addField('🆔 Bot User', interaction.client.user.tag);
                embed.addField('🏠 Test Server', config.TEST_GUILD_ID || 'Not set');
                embed.addField('📊 Guilds', `${interaction.client.guilds.cache.size} servers`);
                embed.addField('👥 Users', `${interaction.client.users.cache.size} users`);
                embed.addField('💾 Database', process.env.DATABASE_URL ? 'Configured' : 'Not configured');
                break;
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
