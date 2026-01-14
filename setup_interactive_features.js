// Setup database tables for interactive features
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupTables() {
    try {
        console.log('Creating interactive features tables...');

        // Daily login tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_logins (
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                current_streak INTEGER DEFAULT 1,
                longest_streak INTEGER DEFAULT 1,
                last_claim_date DATE NOT NULL,
                total_claims INTEGER DEFAULT 1,
                last_connection_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id)
            )
        `);
        console.log('✓ daily_logins table created');

        // Achievements tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                achievement_id VARCHAR(100) NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id, achievement_id)
            )
        `);
        console.log('✓ user_achievements table created');

        // Property ownership (taverns, shops, etc.)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_properties (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                property_type VARCHAR(100) NOT NULL,
                property_name VARCHAR(255) NOT NULL,
                purchase_price INTEGER NOT NULL,
                daily_income INTEGER NOT NULL,
                last_collection_date DATE,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, user_id, property_type)
            )
        `);
        console.log('✓ user_properties table created');

        // Crafting inventory (ores, materials, etc.)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_inventory (
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                item_id VARCHAR(100) NOT NULL,
                quantity INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id, item_id)
            )
        `);
        console.log('✓ user_inventory table created');

        // Story campaign progress
        await pool.query(`
            CREATE TABLE IF NOT EXISTS campaign_progress (
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                campaign_id VARCHAR(100) NOT NULL,
                current_chapter INTEGER DEFAULT 1,
                completed BOOLEAN DEFAULT FALSE,
                last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id, campaign_id)
            )
        `);
        console.log('✓ campaign_progress table created');

        // Weekly leaderboard snapshot
        await pool.query(`
            CREATE TABLE IF NOT EXISTS weekly_earnings (
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                week_start DATE NOT NULL,
                total_earned INTEGER DEFAULT 0,
                PRIMARY KEY (guild_id, user_id, week_start)
            )
        `);
        console.log('✓ weekly_earnings table created');

        // Create indexes for performance
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_logins_guild ON daily_logins(guild_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(guild_id, user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_user ON user_properties(guild_id, user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(guild_id, user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_earnings ON weekly_earnings(guild_id, week_start)`);
        console.log('✓ Indexes created');

        console.log('\n✅ All interactive features tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

setupTables();
