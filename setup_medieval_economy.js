const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function setupMedievalEconomy() {
    const client = await pool.connect();
    
    try {
        console.log('Setting up Medieval Economy tables...');
        
        // 1. Bounties Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS bounties (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                target_dayz_name VARCHAR(255) NOT NULL,
                target_user_id VARCHAR(255),
                placer_dayz_name VARCHAR(255) NOT NULL,
                placer_user_id VARCHAR(255) NOT NULL,
                amount INTEGER NOT NULL,
                claimed BOOLEAN DEFAULT FALSE,
                claimed_by_dayz_name VARCHAR(255),
                claimed_by_user_id VARCHAR(255),
                created_at BIGINT NOT NULL,
                claimed_at BIGINT,
                UNIQUE(guild_id, target_dayz_name, claimed)
            )
        `);
        console.log('✓ Bounties table created');
        
        // 2. Lottery Tickets Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS lottery_tickets (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                dayz_name VARCHAR(255) NOT NULL,
                ticket_number INTEGER NOT NULL,
                draw_id INTEGER NOT NULL,
                purchased_at BIGINT NOT NULL
            )
        `);
        console.log('✓ Lottery tickets table created');
        
        // 3. Lottery Draws Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS lottery_draws (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                draw_id INTEGER NOT NULL,
                total_pot INTEGER DEFAULT 0,
                winning_ticket INTEGER,
                winner_user_id VARCHAR(255),
                winner_dayz_name VARCHAR(255),
                drawn_at BIGINT,
                is_active BOOLEAN DEFAULT TRUE,
                UNIQUE(guild_id, draw_id)
            )
        `);
        console.log('✓ Lottery draws table created');
        
        // 4. Medieval Titles/Ranks Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS medieval_titles (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                dayz_name VARCHAR(255) NOT NULL,
                title VARCHAR(50) NOT NULL DEFAULT 'Peasant',
                title_level INTEGER DEFAULT 0,
                purchased_at BIGINT NOT NULL,
                UNIQUE(guild_id, user_id)
            )
        `);
        console.log('✓ Medieval titles table created');
        
        // 5. Tournament Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                tournament_id INTEGER NOT NULL,
                entry_fee INTEGER NOT NULL,
                total_pot INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                started_at BIGINT NOT NULL,
                ended_at BIGINT,
                winner_user_id VARCHAR(255),
                winner_dayz_name VARCHAR(255),
                UNIQUE(guild_id, tournament_id)
            )
        `);
        console.log('✓ Tournaments table created');
        
        // 6. Tournament Entries Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tournament_entries (
                id SERIAL PRIMARY KEY,
                tournament_id INTEGER NOT NULL,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                dayz_name VARCHAR(255) NOT NULL,
                entry_fee_paid INTEGER NOT NULL,
                entered_at BIGINT NOT NULL,
                kills INTEGER DEFAULT 0
            )
        `);
        console.log('✓ Tournament entries table created');
        
        // 7. Gambling History Table (for dice games)
        await client.query(`
            CREATE TABLE IF NOT EXISTS gambling_history (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                dayz_name VARCHAR(255) NOT NULL,
                game_type VARCHAR(50) NOT NULL,
                bet_amount INTEGER NOT NULL,
                result VARCHAR(20) NOT NULL,
                winnings INTEGER DEFAULT 0,
                played_at BIGINT NOT NULL
            )
        `);
        console.log('✓ Gambling history table created');
        
        // 8. Heist Events Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS heist_events (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                heist_id INTEGER NOT NULL,
                pot_amount INTEGER NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                started_at BIGINT NOT NULL,
                ended_at BIGINT,
                winning_team VARCHAR(50),
                UNIQUE(guild_id, heist_id)
            )
        `);
        console.log('✓ Heist events table created');
        
        // 9. Heist Participants Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS heist_participants (
                id SERIAL PRIMARY KEY,
                heist_id INTEGER NOT NULL,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                dayz_name VARCHAR(255) NOT NULL,
                team VARCHAR(50) NOT NULL,
                joined_at BIGINT NOT NULL
            )
        `);
        console.log('✓ Heist participants table created');
        
        console.log('\n🏰 Medieval Economy System setup complete! 🏰');
        console.log('\nNew features available:');
        console.log('• Bounty System');
        console.log('• Medieval Lottery');
        console.log('• Dice/Gambling Games');
        console.log('• Medieval Titles (Peasant → King)');
        console.log('• Tournament System');
        console.log('• Heist Events');
        
    } catch (error) {
        console.error('Error setting up Medieval Economy:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

setupMedievalEconomy();
