const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const db = require('../database.js');

// Medieval Title ranks and costs
const MEDIEVAL_RANKS = [
    { level: 0, title: 'Peasant', cost: 0, discount: 0, emoji: '👨‍🌾' },
    { level: 1, title: 'Squire', cost: 5000, discount: 0.05, emoji: '🛡️' },
    { level: 2, title: 'Knight', cost: 15000, discount: 0.10, emoji: '⚔️' },
    { level: 3, title: 'Lord', cost: 35000, discount: 0.15, emoji: '🏰' },
    { level: 4, title: 'Baron', cost: 75000, discount: 0.20, emoji: '👑' },
    { level: 5, title: 'King', cost: 150000, discount: 0.25, emoji: '♔' }
];

const LOTTERY_TICKET_COST = 100;
const DICE_MIN_BET = 50;
const DICE_MAX_BET = 5000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('medieval')
        .setDescription('Medieval economy games and features')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bounty')
                .setDescription('Place or claim bounties')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Place bounty on player', value: 'place' },
                            { name: 'View active bounties', value: 'list' },
                            { name: 'Check your bounties', value: 'check' }
                        ))
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('DayZ name of target (for placing bounty)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Bounty amount (minimum $500)')
                        .setRequired(false)
                        .setMinValue(500)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lottery')
                .setDescription('Buy lottery tickets or check the draw')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Buy ticket ($100)', value: 'buy' },
                            { name: 'View current pot', value: 'pot' },
                            { name: 'Check my tickets', value: 'mytickets' },
                            { name: 'Draw winner (admin)', value: 'draw' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dice')
                .setDescription('Roll dice and gamble!')
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Amount to bet ($50-$5000)')
                        .setRequired(true)
                        .setMinValue(50)
                        .setMaxValue(5000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('title')
                .setDescription('View or upgrade your medieval title')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'View my title', value: 'view' },
                            { name: 'Upgrade title', value: 'upgrade' },
                            { name: 'View all ranks', value: 'ranks' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tournament')
                .setDescription('Enter or manage tournaments')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enter tournament', value: 'enter' },
                            { name: 'View active tournament', value: 'view' },
                            { name: 'Start tournament (admin)', value: 'start' },
                            { name: 'End tournament (admin)', value: 'end' }
                        ))
                .addIntegerOption(option =>
                    option.setName('entryfee')
                        .setDescription('Entry fee for tournament (admin only)')
                        .setRequired(false)
                        .setMinValue(100))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'bounty') {
            return await handleBounty(interaction);
        } else if (subcommand === 'lottery') {
            return await handleLottery(interaction);
        } else if (subcommand === 'dice') {
            return await handleDice(interaction);
        } else if (subcommand === 'title') {
            return await handleTitle(interaction);
        } else if (subcommand === 'tournament') {
            return await handleTournament(interaction);
        }
    },
};

// ===== BOUNTY SYSTEM =====
async function handleBounty(interaction) {
    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    if (action === 'place') {
        const target = interaction.options.getString('target');
        const amount = interaction.options.getInteger('amount');
        
        if (!target || !amount) {
            return interaction.reply({ content: '⚔️ You must specify a target player and bounty amount!', ephemeral: true });
        }
        
        // Check if placer has enough money
        const balance = await db.getBalance(guildId, userId);
        if (balance < amount) {
            return interaction.reply({ content: `⚔️ You don't have enough gold! You need $${amount} but only have $${balance}.`, ephemeral: true });
        }
        
        // Get placer's DayZ name
        const placerDayzName = await db.getDayZName(guildId, userId);
        if (!placerDayzName) {
            return interaction.reply({ content: '⚔️ You must register with `/register` before placing bounties!', ephemeral: true });
        }
        
        try {
            // Deduct money
            await db.addBalance(guildId, userId, -amount);
            
            // Create bounty
            await db.query(`
                INSERT INTO bounties (guild_id, target_dayz_name, placer_dayz_name, placer_user_id, amount, created_at, claimed)
                VALUES ($1, $2, $3, $4, $5, $6, FALSE)
                ON CONFLICT (guild_id, target_dayz_name, claimed) WHERE claimed = FALSE
                DO UPDATE SET amount = bounties.amount + $5
            `, [guildId, target.toLowerCase(), placerDayzName, userId, amount, Date.now()]);
            
            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('⚔️ BOUNTY PLACED ⚔️')
                .setDescription(`**${placerDayzName}** has placed a bounty on **${target}**!`)
                .addFields(
                    { name: '💰 Reward', value: `$${amount}`, inline: true },
                    { name: '🎯 Target', value: target, inline: true }
                )
                .setFooter({ text: 'Kill the target to claim the bounty!' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error placing bounty:', error);
            return interaction.reply({ content: '⚔️ Error placing bounty. Please try again.', ephemeral: true });
        }
    }
    
    else if (action === 'list') {
        const bounties = await db.query(`
            SELECT target_dayz_name, SUM(amount) as total_bounty, COUNT(*) as num_bounties
            FROM bounties
            WHERE guild_id = $1 AND claimed = FALSE
            GROUP BY target_dayz_name
            ORDER BY total_bounty DESC
            LIMIT 10
        `, [guildId]);
        
        if (bounties.rows.length === 0) {
            return interaction.reply({ content: '⚔️ No active bounties at the moment. Peace reigns... for now.', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#8B0000')
            .setTitle('⚔️ ACTIVE BOUNTIES ⚔️')
            .setDescription('Slay these targets to claim your reward!')
            .setTimestamp();
        
        bounties.rows.forEach((bounty, index) => {
            embed.addFields({
                name: `${index + 1}. ${bounty.target_dayz_name}`,
                value: `💰 **$${bounty.total_bounty}** (${bounty.num_bounties} bounty/bounties)`,
                inline: false
            });
        });
        
        return interaction.reply({ embeds: [embed] });
    }
    
    else if (action === 'check') {
        const dayzName = await db.getDayZName(guildId, userId);
        if (!dayzName) {
            return interaction.reply({ content: '⚔️ Register with `/register` first!', ephemeral: true });
        }
        
        const bountyOn = await db.query(`
            SELECT SUM(amount) as total_bounty, COUNT(*) as num_bounties
            FROM bounties
            WHERE guild_id = $1 AND LOWER(target_dayz_name) = LOWER($2) AND claimed = FALSE
        `, [guildId, dayzName]);
        
        const bountyBy = await db.query(`
            SELECT SUM(amount) as total_placed
            FROM bounties
            WHERE guild_id = $1 AND placer_user_id = $2 AND claimed = FALSE
        `, [guildId, userId]);
        
        const embed = new EmbedBuilder()
            .setColor('#8B0000')
            .setTitle('⚔️ YOUR BOUNTY STATUS ⚔️')
            .addFields(
                { name: '💀 Bounty on your head', value: `$${bountyOn.rows[0].total_bounty || 0}`, inline: true },
                { name: '⚔️ Bounties you placed', value: `$${bountyBy.rows[0].total_placed || 0}`, inline: true }
            )
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// ===== LOTTERY SYSTEM =====
async function handleLottery(interaction) {
    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    if (action === 'buy') {
        const balance = await db.getBalance(guildId, userId);
        if (balance < LOTTERY_TICKET_COST) {
            return interaction.reply({ content: `🎟️ You need $${LOTTERY_TICKET_COST} to buy a lottery ticket!`, ephemeral: true });
        }
        
        const dayzName = await db.getDayZName(guildId, userId);
        if (!dayzName) {
            return interaction.reply({ content: '🎟️ Register with `/register` first!', ephemeral: true });
        }
        
        try {
            // Get or create current draw
            let draw = await db.query(`
                SELECT * FROM lottery_draws 
                WHERE guild_id = $1 AND is_active = TRUE
                ORDER BY draw_id DESC LIMIT 1
            `, [guildId]);
            
            let drawId;
            if (draw.rows.length === 0) {
                // Create new draw
                const newDraw = await db.query(`
                    INSERT INTO lottery_draws (guild_id, draw_id, total_pot, is_active)
                    VALUES ($1, 1, 0, TRUE)
                    ON CONFLICT (guild_id, draw_id) DO NOTHING
                    RETURNING draw_id
                `, [guildId]);
                drawId = newDraw.rows[0]?.draw_id || 1;
            } else {
                drawId = draw.rows[0].draw_id;
            }
            
            // Generate ticket number
            const ticketNumber = Math.floor(Math.random() * 1000000);
            
            // Deduct money and create ticket
            await db.addBalance(guildId, userId, -LOTTERY_TICKET_COST);
            await db.query(`
                INSERT INTO lottery_tickets (guild_id, user_id, dayz_name, ticket_number, draw_id, purchased_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [guildId, userId, dayzName, ticketNumber, drawId, Date.now()]);
            
            // Update pot
            await db.query(`
                UPDATE lottery_draws 
                SET total_pot = total_pot + $1
                WHERE guild_id = $2 AND draw_id = $3
            `, [LOTTERY_TICKET_COST, guildId, drawId]);
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎟️ LOTTERY TICKET PURCHASED 🎟️')
                .setDescription(`**${dayzName}** bought a ticket!`)
                .addFields(
                    { name: '🎫 Ticket Number', value: `#${ticketNumber}`, inline: true },
                    { name: '💰 Cost', value: `$${LOTTERY_TICKET_COST}`, inline: true }
                )
                .setFooter({ text: 'Good luck in the Royal Draw!' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error buying lottery ticket:', error);
            return interaction.reply({ content: '🎟️ Error purchasing ticket. Please try again.', ephemeral: true });
        }
    }
    
    else if (action === 'pot') {
        const draw = await db.query(`
            SELECT * FROM lottery_draws 
            WHERE guild_id = $1 AND is_active = TRUE
            ORDER BY draw_id DESC LIMIT 1
        `, [guildId]);
        
        if (draw.rows.length === 0) {
            return interaction.reply({ content: '🎟️ No active lottery draw. Buy a ticket to start one!', ephemeral: true });
        }
        
        const ticketCount = await db.query(`
            SELECT COUNT(*) as count FROM lottery_tickets
            WHERE guild_id = $1 AND draw_id = $2
        `, [guildId, draw.rows[0].draw_id]);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎟️ ROYAL LOTTERY 🎟️')
            .setDescription('The King\'s Fortune awaits!')
            .addFields(
                { name: '💰 Current Pot', value: `$${draw.rows[0].total_pot}`, inline: true },
                { name: '🎫 Tickets Sold', value: `${ticketCount.rows[0].count}`, inline: true }
            )
            .setFooter({ text: 'Use /medieval lottery buy to enter!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
    
    else if (action === 'mytickets') {
        const dayzName = await db.getDayZName(guildId, userId);
        if (!dayzName) {
            return interaction.reply({ content: '🎟️ Register with `/register` first!', ephemeral: true });
        }
        
        const draw = await db.query(`
            SELECT draw_id FROM lottery_draws 
            WHERE guild_id = $1 AND is_active = TRUE
            ORDER BY draw_id DESC LIMIT 1
        `, [guildId]);
        
        if (draw.rows.length === 0) {
            return interaction.reply({ content: '🎟️ No active lottery draw.', ephemeral: true });
        }
        
        const tickets = await db.query(`
            SELECT ticket_number FROM lottery_tickets
            WHERE guild_id = $1 AND user_id = $2 AND draw_id = $3
            ORDER BY purchased_at DESC
        `, [guildId, userId, draw.rows[0].draw_id]);
        
        if (tickets.rows.length === 0) {
            return interaction.reply({ content: '🎟️ You have no tickets for the current draw.', ephemeral: true });
        }
        
        const ticketNumbers = tickets.rows.map(t => `#${t.ticket_number}`).join(', ');
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎟️ YOUR LOTTERY TICKETS 🎟️')
            .setDescription(`**${dayzName}** has **${tickets.rows.length}** ticket(s)`)
            .addFields({ name: '🎫 Ticket Numbers', value: ticketNumbers })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (action === 'draw') {
        // Admin only
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '👑 Only administrators can draw the lottery!', ephemeral: true });
        }
        
        const draw = await db.query(`
            SELECT * FROM lottery_draws 
            WHERE guild_id = $1 AND is_active = TRUE
            ORDER BY draw_id DESC LIMIT 1
        `, [guildId]);
        
        if (draw.rows.length === 0 || draw.rows[0].total_pot === 0) {
            return interaction.reply({ content: '🎟️ No active lottery with tickets sold!', ephemeral: true });
        }
        
        // Get all tickets
        const tickets = await db.query(`
            SELECT * FROM lottery_tickets
            WHERE guild_id = $1 AND draw_id = $2
        `, [guildId, draw.rows[0].draw_id]);
        
        if (tickets.rows.length === 0) {
            return interaction.reply({ content: '🎟️ No tickets sold for this draw!', ephemeral: true });
        }
        
        // Pick random winner
        const winner = tickets.rows[Math.floor(Math.random() * tickets.rows.length)];
        const pot = draw.rows[0].total_pot;
        
        // Award winnings
        await db.addBalance(guildId, winner.user_id, pot);
        
        // Mark draw as complete
        await db.query(`
            UPDATE lottery_draws
            SET is_active = FALSE, winning_ticket = $1, winner_user_id = $2, winner_dayz_name = $3, drawn_at = $4
            WHERE guild_id = $5 AND draw_id = $6
        `, [winner.ticket_number, winner.user_id, winner.dayz_name, Date.now(), guildId, draw.rows[0].draw_id]);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎟️ 👑 LOTTERY WINNER! 👑 🎟️')
            .setDescription(`**THE KING'S FORTUNE HAS BEEN CLAIMED!**`)
            .addFields(
                { name: '🏆 Winner', value: winner.dayz_name, inline: true },
                { name: '🎫 Winning Ticket', value: `#${winner.ticket_number}`, inline: true },
                { name: '💰 Prize', value: `$${pot}`, inline: true }
            )
            .setFooter({ text: 'Congratulations to the winner!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
}

// ===== DICE GAME =====
async function handleDice(interaction) {
    const bet = interaction.options.getInteger('bet');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    const balance = await db.getBalance(guildId, userId);
    if (balance < bet) {
        return interaction.reply({ content: `🎲 You don't have enough gold! You need $${bet} but only have $${balance}.`, ephemeral: true });
    }
    
    const dayzName = await db.getDayZName(guildId, userId);
    if (!dayzName) {
        return interaction.reply({ content: '🎲 Register with `/register` first!', ephemeral: true });
    }
    
    // Roll dice
    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const houseRoll = Math.floor(Math.random() * 6) + 1;
    
    let result, winnings = 0;
    if (playerRoll > houseRoll) {
        result = 'WIN';
        winnings = bet * 2;
        await db.addBalance(guildId, userId, bet); // Net gain is bet amount
    } else if (playerRoll < houseRoll) {
        result = 'LOSS';
        await db.addBalance(guildId, userId, -bet);
    } else {
        result = 'TIE';
        // No money changes hands on tie
    }
    
    // Record in gambling history
    await db.query(`
        INSERT INTO gambling_history (guild_id, user_id, dayz_name, game_type, bet_amount, result, winnings, played_at)
        VALUES ($1, $2, $3, 'dice', $4, $5, $6, $7)
    `, [guildId, userId, dayzName, bet, result, winnings, Date.now()]);
    
    const embed = new EmbedBuilder()
        .setColor(result === 'WIN' ? '#00FF00' : result === 'LOSS' ? '#FF0000' : '#FFFF00')
        .setTitle('🎲 TAVERN DICE GAME 🎲')
        .setDescription(`**${dayzName}** rolls the dice!`)
        .addFields(
            { name: '🎲 Your Roll', value: `${playerRoll}`, inline: true },
            { name: '🎲 House Roll', value: `${houseRoll}`, inline: true },
            { name: '💰 Bet', value: `$${bet}`, inline: true }
        )
        .setTimestamp();
    
    if (result === 'WIN') {
        embed.addFields({ name: '🏆 Result', value: `**YOU WIN! +$${bet}**`, inline: false });
    } else if (result === 'LOSS') {
        embed.addFields({ name: '💀 Result', value: `**YOU LOSE! -$${bet}**`, inline: false });
    } else {
        embed.addFields({ name: '⚖️ Result', value: `**TIE! No gold changes hands.**`, inline: false });
    }
    
    return interaction.reply({ embeds: [embed] });
}

// ===== MEDIEVAL TITLES =====
async function handleTitle(interaction) {
    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    if (action === 'view') {
        const dayzName = await db.getDayZName(guildId, userId);
        if (!dayzName) {
            return interaction.reply({ content: '👑 Register with `/register` first!', ephemeral: true });
        }
        
        let titleData = await db.query(`
            SELECT * FROM medieval_titles
            WHERE guild_id = $1 AND user_id = $2
        `, [guildId, userId]);
        
        let currentRank = MEDIEVAL_RANKS[0]; // Default to Peasant
        if (titleData.rows.length > 0) {
            currentRank = MEDIEVAL_RANKS.find(r => r.level === titleData.rows[0].title_level) || MEDIEVAL_RANKS[0];
        }
        
        const nextRank = MEDIEVAL_RANKS[currentRank.level + 1];
        
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle(`${currentRank.emoji} YOUR MEDIEVAL TITLE ${currentRank.emoji}`)
            .setDescription(`**${dayzName}** is a **${currentRank.title}**!`)
            .addFields(
                { name: '💰 Shop Discount', value: `${(currentRank.discount * 100).toFixed(0)}%`, inline: true },
                { name: '🏆 Rank Level', value: `${currentRank.level}/5`, inline: true }
            )
            .setTimestamp();
        
        if (nextRank) {
            embed.addFields({
                name: `⬆️ Next Rank: ${nextRank.title} ${nextRank.emoji}`,
                value: `Cost: $${nextRank.cost} | Discount: ${(nextRank.discount * 100).toFixed(0)}%`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '👑 YOU ARE THE KING!',
                value: 'Maximum rank achieved!',
                inline: false
            });
        }
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (action === 'upgrade') {
        const dayzName = await db.getDayZName(guildId, userId);
        if (!dayzName) {
            return interaction.reply({ content: '👑 Register with `/register` first!', ephemeral: true });
        }
        
        let titleData = await db.query(`
            SELECT * FROM medieval_titles
            WHERE guild_id = $1 AND user_id = $2
        `, [guildId, userId]);
        
        let currentLevel = 0;
        if (titleData.rows.length > 0) {
            currentLevel = titleData.rows[0].title_level;
        }
        
        const nextRank = MEDIEVAL_RANKS[currentLevel + 1];
        if (!nextRank) {
            return interaction.reply({ content: '👑 You are already the King! Maximum rank achieved.', ephemeral: true });
        }
        
        const balance = await db.getBalance(guildId, userId);
        if (balance < nextRank.cost) {
            return interaction.reply({ content: `👑 You need $${nextRank.cost} to upgrade to ${nextRank.title}! You only have $${balance}.`, ephemeral: true });
        }
        
        // Deduct cost and upgrade
        await db.addBalance(guildId, userId, -nextRank.cost);
        
        if (titleData.rows.length === 0) {
            await db.query(`
                INSERT INTO medieval_titles (guild_id, user_id, dayz_name, title, title_level, purchased_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [guildId, userId, dayzName, nextRank.title, nextRank.level, Date.now()]);
        } else {
            await db.query(`
                UPDATE medieval_titles
                SET title = $1, title_level = $2, purchased_at = $3
                WHERE guild_id = $4 AND user_id = $5
            `, [nextRank.title, nextRank.level, Date.now(), guildId, userId]);
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${nextRank.emoji} TITLE UPGRADED! ${nextRank.emoji}`)
            .setDescription(`**${dayzName}** has been promoted to **${nextRank.title}**!`)
            .addFields(
                { name: '💰 Cost', value: `$${nextRank.cost}`, inline: true },
                { name: '🎁 New Discount', value: `${(nextRank.discount * 100).toFixed(0)}%`, inline: true }
            )
            .setFooter({ text: 'Your new discount applies to all shop purchases!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
    
    else if (action === 'ranks') {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('👑 MEDIEVAL TITLE RANKS 👑')
            .setDescription('Rise from Peasant to King!')
            .setTimestamp();
        
        MEDIEVAL_RANKS.forEach(rank => {
            embed.addFields({
                name: `${rank.emoji} ${rank.title}`,
                value: `Cost: $${rank.cost} | Discount: ${(rank.discount * 100).toFixed(0)}%`,
                inline: false
            });
        });
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// ===== TOURNAMENT SYSTEM =====
async function handleTournament(interaction) {
    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    if (action === 'enter') {
        // Check if there's an active tournament
        const tournament = await db.query(`
            SELECT * FROM tournaments
            WHERE guild_id = $1 AND is_active = TRUE
            ORDER BY tournament_id DESC LIMIT 1
        `, [guildId]);
        
        if (tournament.rows.length === 0) {
            return interaction.reply({ content: '⚔️ No active tournament! Wait for an admin to start one.', ephemeral: true });
        }
        
        const tournamentData = tournament.rows[0];
        const entryFee = tournamentData.entry_fee;
        
        // Check if already entered
        const existing = await db.query(`
            SELECT * FROM tournament_entries
            WHERE tournament_id = $1 AND user_id = $2
        `, [tournamentData.id, userId]);
        
        if (existing.rows.length > 0) {
            return interaction.reply({ content: '⚔️ You are already entered in this tournament!', ephemeral: true });
        }
        
        const balance = await db.getBalance(guildId, userId);
        if (balance < entryFee) {
            return interaction.reply({ content: `⚔️ You need $${entryFee} to enter! You only have $${balance}.`, ephemeral: true });
        }
        
        const dayzName = await db.getDayZName(guildId, userId);
        if (!dayzName) {
            return interaction.reply({ content: '⚔️ Register with `/register` first!', ephemeral: true });
        }
        
        // Deduct entry fee and enter tournament
        await db.addBalance(guildId, userId, -entryFee);
        await db.query(`
            INSERT INTO tournament_entries (tournament_id, guild_id, user_id, dayz_name, entry_fee_paid, entered_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [tournamentData.id, guildId, userId, dayzName, entryFee, Date.now()]);
        
        // Update pot
        await db.query(`
            UPDATE tournaments
            SET total_pot = total_pot + $1
            WHERE id = $2
        `, [entryFee, tournamentData.id]);
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚔️ TOURNAMENT ENTRY CONFIRMED ⚔️')
            .setDescription(`**${dayzName}** has entered the arena!`)
            .addFields(
                { name: '💰 Entry Fee', value: `$${entryFee}`, inline: true },
                { name: '🏆 Current Pot', value: `$${tournamentData.total_pot + entryFee}`, inline: true }
            )
            .setFooter({ text: 'May the best warrior win!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
    
    else if (action === 'view') {
        const tournament = await db.query(`
            SELECT * FROM tournaments
            WHERE guild_id = $1 AND is_active = TRUE
            ORDER BY tournament_id DESC LIMIT 1
        `, [guildId]);
        
        if (tournament.rows.length === 0) {
            return interaction.reply({ content: '⚔️ No active tournament at the moment.', ephemeral: true });
        }
        
        const entries = await db.query(`
            SELECT COUNT(*) as count FROM tournament_entries
            WHERE tournament_id = $1
        `, [tournament.rows[0].id]);
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚔️ ACTIVE TOURNAMENT ⚔️')
            .setDescription('The arena awaits brave warriors!')
            .addFields(
                { name: '💰 Entry Fee', value: `$${tournament.rows[0].entry_fee}`, inline: true },
                { name: '🏆 Prize Pot', value: `$${tournament.rows[0].total_pot}`, inline: true },
                { name: '👥 Participants', value: `${entries.rows[0].count}`, inline: true }
            )
            .setFooter({ text: 'Use /medieval tournament enter to join!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
    
    else if (action === 'start') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '⚔️ Only administrators can start tournaments!', ephemeral: true });
        }
        
        const entryFee = interaction.options.getInteger('entryfee') || 500;
        
        // Get next tournament ID
        const lastTournament = await db.query(`
            SELECT tournament_id FROM tournaments
            WHERE guild_id = $1
            ORDER BY tournament_id DESC LIMIT 1
        `, [guildId]);
        
        const nextId = lastTournament.rows.length > 0 ? lastTournament.rows[0].tournament_id + 1 : 1;
        
        await db.query(`
            INSERT INTO tournaments (guild_id, tournament_id, entry_fee, total_pot, is_active, started_at)
            VALUES ($1, $2, $3, 0, TRUE, $4)
        `, [guildId, nextId, entryFee, Date.now()]);
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚔️ 🏰 TOURNAMENT STARTED! 🏰 ⚔️')
            .setDescription('The arena is open! Warriors, step forward!')
            .addFields(
                { name: '💰 Entry Fee', value: `$${entryFee}`, inline: true },
                { name: '🏆 Prize', value: 'Winner takes all!', inline: true }
            )
            .setFooter({ text: 'Use /medieval tournament enter to join!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
    
    else if (action === 'end') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '⚔️ Only administrators can end tournaments!', ephemeral: true });
        }
        
        const tournament = await db.query(`
            SELECT * FROM tournaments
            WHERE guild_id = $1 AND is_active = TRUE
            ORDER BY tournament_id DESC LIMIT 1
        `, [guildId]);
        
        if (tournament.rows.length === 0) {
            return interaction.reply({ content: '⚔️ No active tournament to end!', ephemeral: true });
        }
        
        // Get all entries and pick highest kills (or random if no kills tracked)
        const entries = await db.query(`
            SELECT * FROM tournament_entries
            WHERE tournament_id = $1
            ORDER BY kills DESC, entered_at ASC
        `, [tournament.rows[0].id]);
        
        if (entries.rows.length === 0) {
            return interaction.reply({ content: '⚔️ No participants in this tournament!', ephemeral: true });
        }
        
        const winner = entries.rows[0];
        const pot = tournament.rows[0].total_pot;
        
        // Award prize
        await db.addBalance(guildId, winner.user_id, pot);
        
        // Mark tournament as ended
        await db.query(`
            UPDATE tournaments
            SET is_active = FALSE, ended_at = $1, winner_user_id = $2, winner_dayz_name = $3
            WHERE id = $4
        `, [Date.now(), winner.user_id, winner.dayz_name, tournament.rows[0].id]);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚔️ 👑 TOURNAMENT CHAMPION! 👑 ⚔️')
            .setDescription('**A VICTOR HAS EMERGED FROM THE ARENA!**')
            .addFields(
                { name: '🏆 Champion', value: winner.dayz_name, inline: true },
                { name: '💰 Prize', value: `$${pot}`, inline: true },
                { name: '👥 Competitors', value: `${entries.rows.length}`, inline: true }
            )
            .setFooter({ text: 'Glory to the champion!' })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
}
