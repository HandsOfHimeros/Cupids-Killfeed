// Setup script for medieval economy tables
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupMedievalEconomy() {
    console.log('Setting up medieval economy tables...');
    
    try {
        // Create bounties table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bounties (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                placer_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                is_active BOOLEAN DEFAULT true,
                placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created bounties table');
        
        // Create user_stats table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_stats (
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                total_earned INTEGER DEFAULT 0,
                total_spent INTEGER DEFAULT 0,
                mini_games_played INTEGER DEFAULT 0,
                mini_games_won INTEGER DEFAULT 0,
                bounties_claimed INTEGER DEFAULT 0,
                distance_traveled INTEGER DEFAULT 0,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (guild_id, user_id, entry_date)
            )
        `);
        console.log('✓ Created tournament_entries table');
        
        // Create indexes for better performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_bounties_guild_active 
            ON bounties(guild_id, is_active)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_bounties_target 
            ON bounties(guild_id, target_id, is_active)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_stats_guild 
            ON user_stats(guild_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_tournament_guild_date 
            ON tournament_entries(guild_id, entry_date)
        `);
        console.log('✓ Created indexes');
        
        console.log('\n✅ Medieval economy setup complete!');
        
    } catch (error) {
        console.error('❌ Error setting up medieval economy:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    setupMedievalEconomy()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { setupMedievalEconomy };
