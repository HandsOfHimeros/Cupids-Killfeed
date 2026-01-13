// Setup script for medieval rank system tables
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupMedievalRanks() {
    console.log('Setting up medieval rank system tables...');

    try {
        // Create user_stats table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_stats (
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                total_earned INTEGER DEFAULT 0,
                total_spent INTEGER DEFAULT 0,
                mini_games_played INTEGER DEFAULT 0,
                mini_games_won INTEGER DEFAULT 0,
                distance_traveled INTEGER DEFAULT 0,
                last_stipend_claim TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id)
            )
        `);
        console.log('✓ Created user_stats table');

        // Create tournament_entries table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tournament_entries (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                entry_date DATE NOT NULL,
                entry_cost INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                placement INTEGER,
                prize_won INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (guild_id, user_id, entry_date)
            )
        `);
        console.log('✓ Created tournament_entries table');

        // Create duel_history table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS duel_history (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                challenger_id TEXT NOT NULL,
                opponent_id TEXT NOT NULL,
                stakes INTEGER NOT NULL,
                winner_id TEXT,
                rounds_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created duel_history table');

        // Create indexes for better performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_stats_guild
            ON user_stats(guild_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_stats_earned
            ON user_stats(guild_id, total_earned DESC)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_tournament_guild_date
            ON tournament_entries(guild_id, entry_date)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_duel_history_guild
            ON duel_history(guild_id, created_at DESC)
        `);
        console.log('✓ Created indexes');

        console.log('\n✅ Medieval rank system setup complete!');

    } catch (error) {
        console.error('❌ Error setting up medieval ranks:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    setupMedievalRanks()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { setupMedievalRanks };
