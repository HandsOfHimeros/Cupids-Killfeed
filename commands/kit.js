// WEAPON KIT BUILDER - Interactive customization system
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const db = require('../database.js');
const weaponKits = require('../weapon_kits.js');

// Temporary storage for active kit building sessions
const activeSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kit')
        .setDescription('🔫 Build custom weapon kits with attachments')
        .addSubcommand(subcommand =>
            subcommand
                .setName('build')
                .setDescription('Start building a custom weapon kit'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your kit purchase history'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pending')
                .setDescription('View kits waiting to be spawned')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'build':
                await this.showWeaponSelection(interaction);
                break;
            case 'history':
                await this.showKitHistory(interaction);
                break;
            case 'pending':
                await this.showPendingKits(interaction);
                break;
        }
    },

    async showWeaponSelection(interaction) {
        const embed = new MessageEmbed()
            .setColor('#ff6600')
            .setTitle('🔫 Weapon Kit Builder')
            .setDescription('Select a weapon to start customizing your kit:')
            .addField('Available Weapons', Object.keys(weaponKits).join('\n'))
            .setFooter({ text: 'Each weapon has unique attachment options and pricing' });

        const rows = [];
        const weapons = Object.keys(weaponKits);
        
        // Create buttons in rows of 5
        for (let i = 0; i < weapons.length; i += 5) {
            const row = new MessageActionRow();
            const slice = weapons.slice(i, i + 5);
            
            slice.forEach(weaponName => {
                row.addComponents(
                    new MessageButton()
                        .setCustomId(`kit_weapon_${weaponName}`)
                        .setLabel(weaponName)
                        .setStyle('PRIMARY')
                );
            });
            
            rows.push(row);
        }

        await interaction.reply({ embeds: [embed], components: rows });
    },

    async handleWeaponSelection(interaction) {
        const weaponName = interaction.customId.replace('kit_weapon_', '');
        const kit = weaponKits[weaponName];

        if (!kit) {
            return interaction.reply({ content: '❌ Weapon not found!', ephemeral: true });
        }

        // Initialize session
        const sessionId = `${interaction.user.id}_${Date.now()}`;
        activeSessions.set(sessionId, {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            weaponName: weaponName,
            selectedVariant: null,
            selectedAttachments: {},
            totalCost: 0
        });

        // Show variant selection
        const embed = new MessageEmbed()
            .setColor('#ff6600')
            .setTitle(`🔫 ${weaponName} - Select Variant`)
            .setDescription(kit.name || 'Choose your weapon variant:')
            .addField('Base Price', `${kit.basePrice} coins`, true);

        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId(`kit_variant_${sessionId}`)
                    .setPlaceholder('Choose weapon variant')
                    .addOptions(kit.baseWeapon.variants.map((variantClass, index) => ({
                        label: variantClass,
                        value: variantClass,
                        description: `Base weapon variant`
                    })))
            );

        await interaction.update({ embeds: [embed], components: [row] });
    },

    async handleVariantSelection(interaction) {
        const sessionId = interaction.customId.replace('kit_variant_', '');
        const session = activeSessions.get(sessionId);

        if (!session || session.userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Session expired! Please start over.' });
        }

        const selectedVariant = interaction.values[0];
        const kit = weaponKits[session.weaponName];

        session.selectedVariant = selectedVariant; // Just store the class name
        session.totalCost = kit.basePrice;

        // Show attachment selection
        await this.showAttachmentSelection(interaction, session, sessionId);
    },

    async showAttachmentSelection(interaction, session, sessionId) {
        const kit = weaponKits[session.weaponName];
        
        // Build selected attachments display
        let selectedText = '';
        for (const [slotName, slotData] of Object.entries(kit.attachments)) {
            const selected = session.selectedAttachments[slotName];
            if (selected) {
                const option = slotData.options[selected.index];
                selectedText += `\n**${slotData.name}:** ${option.name} (+${option.price || 0} coins)`;
            } else if (slotData.required) {
                selectedText += `\n**${slotData.name}:** ⚠️ Not selected`;
            }
        }

        const embed = new MessageEmbed()
            .setColor('#ff6600')
            .setTitle(`🔫 ${session.weaponName} - Customize Attachments`)
            .setDescription(`**Variant:** ${session.selectedVariant}\n**Current Total:** ${session.totalCost} coins${selectedText || '\n\nNo attachments selected yet'}`)
            .setFooter({ text: 'Select attachments or click Finish to complete your kit' });

        const rows = [];

        // Sort slots: required first, then optional (to fit Discord's 5 row limit)
        const sortedSlots = Object.entries(kit.attachments)
            .filter(([_, slotData]) => slotData.options.length > 0)
            .sort((a, b) => (b[1].required ? 1 : 0) - (a[1].required ? 1 : 0));

        // Create select menu for each attachment slot (max 4 due to Discord's 5 row limit)
        for (let i = 0; i < Math.min(4, sortedSlots.length); i++) {
            const [slotName, slotData] = sortedSlots[i];
            const currentSelection = session.selectedAttachments[slotName];

            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId(`kit_attach_${sessionId}_${slotName}`)
                        .setPlaceholder(`${slotData.required ? '⚠️ ' : ''}${slotData.name}${currentSelection ? ` (${slotData.options[currentSelection.index].name})` : ''}`)
                        .addOptions(
                            slotData.options.map((opt, index) => ({
                                label: opt.name,
                                value: opt.class ? `${opt.class}_${index}` : `none_${slotName}_${index}`,
                                description: `${opt.price || 0} coins${opt.compatible ? '' : ' (may not fit all variants)'}`
                            }))
                        )
                );

            rows.push(row);
        }

        // Add finish button
        const finishRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`kit_finish_${sessionId}`)
                    .setLabel('✅ Finish & Purchase')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId(`kit_cancel_${sessionId}`)
                    .setLabel('❌ Cancel')
                    .setStyle('DANGER')
            );

        rows.push(finishRow);

        await interaction.update({ embeds: [embed], components: rows });
    },

    async handleAttachmentSelection(interaction) {
        const parts = interaction.customId.split('_');
        const sessionId = `${parts[2]}_${parts[3]}`;
        const slotName = parts[4];
        const session = activeSessions.get(sessionId);

        if (!session || session.userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Session expired!', ephemeral: true });
        }

        const kit = weaponKits[session.weaponName];
        const selectedValue = interaction.values[0];
        
        // Parse the index from the value (format: "ClassName_index" or "none_slotName_index")
        const lastUnderscore = selectedValue.lastIndexOf('_');
        const optionIndex = parseInt(selectedValue.substring(lastUnderscore + 1));
        const selectedOption = kit.attachments[slotName].options[optionIndex];

        // Remove old attachment cost if exists
        if (session.selectedAttachments[slotName]) {
            const oldIndex = session.selectedAttachments[slotName].index;
            const oldAttach = kit.attachments[slotName].options[oldIndex];
            if (oldAttach) session.totalCost -= (oldAttach.price || 0);
        }

        // Add new attachment (check if it starts with 'none_' to detect null class values)
        if (selectedOption && selectedOption.class) {
            session.selectedAttachments[slotName] = {
                class: selectedOption.class,
                index: optionIndex,
                quantity: selectedOption.quantity || 1
            };
            session.totalCost += (selectedOption.price || 0);
        } else {
            delete session.selectedAttachments[slotName];
        }
        // Update the embed with new total
        await this.showAttachmentSelection(interaction, session, sessionId);
    },

    async handleFinishKit(interaction) {
        const sessionId = interaction.customId.replace('kit_finish_', '');
        const session = activeSessions.get(sessionId);

        if (!session || session.userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Session expired!', ephemeral: true });
        }

        const kit = weaponKits[session.weaponName];

        // Check required attachments
        for (const [slotName, slotData] of Object.entries(kit.attachments)) {
            if (slotData.required && !session.selectedAttachments[slotName]) {
                return interaction.reply({
                    content: `❌ Missing required attachment: ${slotData.name}`,
                    ephemeral: true
                });
            }
        }

        // Check balance
        const balance = await db.getBalance(session.guildId, session.userId);
        if (balance < session.totalCost) {
            return interaction.reply({
                content: `❌ Insufficient funds! You need ${session.totalCost} coins but have ${balance}.`,
                ephemeral: true
            });
        }

        // Deduct balance and save kit
        await db.addBalance(session.guildId, session.userId, -session.totalCost);
        const kitId = await db.createKitPurchase(
            session.guildId,
            session.userId,
            session.weaponName,
            session.selectedVariant,
            session.selectedAttachments,
            session.totalCost
        );

        activeSessions.delete(sessionId);

        const embed = new MessageEmbed()
            .setColor('#00ff00')
            .setTitle('✅ Kit Purchased Successfully!')
            .addField('Weapon', session.weaponName, true)
            .addField('Variant', session.selectedVariant, true)
            .addField('Total Cost', `${session.totalCost} coins`, true)
            .addField('New Balance', `${balance - session.totalCost} coins`, true)
            .addField('📦 Next Steps', 'Your kit will be spawned automatically at the next server restart!')
            .setFooter({ text: `Kit ID: ${kitId}` });

        await interaction.update({ embeds: [embed], components: [] });
    },

    async handleCancelKit(interaction) {
        const sessionId = interaction.customId.replace('kit_cancel_', '');
        activeSessions.delete(sessionId);

        await interaction.update({
            content: '❌ Kit building cancelled.',
            embeds: [],
            components: []
        });
    },

    async showKitHistory(interaction) {
        const history = await db.getKitHistory(interaction.guildId, interaction.user.id, 10);

        if (history.length === 0) {
            return interaction.reply({
                content: '📦 You haven\'t purchased any kits yet! Use `/kit build` to create one.'
            });
        }

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('📦 Your Kit Purchase History')
            .setDescription(history.map(kit => {
                const status = kit.spawned ? '✅ Spawned' : '⏳ Pending';
                return `**${kit.kit_name}** (${kit.weapon_variant})\n${status} • ${kit.total_cost} coins • ${new Date(kit.purchased_at).toLocaleDateString()}`;
            }).join('\n\n'));

        await interaction.reply({ embeds: [embed] });
    },

    async showPendingKits(interaction) {
        const pending = await db.getUnspawnedKits(interaction.guildId, interaction.user.id);

        if (pending.length === 0) {
            return interaction.reply({
                content: '✅ No pending kits! All your kits have been spawned.'
            });
        }

        const embed = new MessageEmbed()
            .setColor('#ffaa00')
            .setTitle('⏳ Kits Awaiting Spawn')
            .setDescription(pending.map(kit => {
                return `**${kit.kit_name}** (${kit.weapon_variant})\nPurchased: ${new Date(kit.purchased_at).toLocaleString()}`;
            }).join('\n\n'))
            .setFooter({ text: 'Kits will spawn automatically at the next server restart' });

        await interaction.reply({ embeds: [embed] });
    }
};
