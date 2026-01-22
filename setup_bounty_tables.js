// Database migration script for bounty system
require('dotenv').config();
const db = require('./database.js');

async function setupBountyTables() {
    try {
        console.log('Setting up bounty system tables...\n');

        // Create bounties table
        console.log('Creating bounties table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS bounties (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                target_user_id VARCHAR(20),
                target_dayz_name VARCHAR(100) NOT NULL,
                placer_user_id VARCHAR(20) NOT NULL,
                amount INTEGER NOT NULL,
                anonymous BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active',
                CONSTRAINT check_amount_positive CHECK (amount > 0),
                CONSTRAINT check_status CHECK (status IN ('active', 'claimed', 'cancelled', 'expired'))
            )
        `);
        console.log('✅ bounties table created');

        // Create indexes for performance
        console.log('Creating indexes...');
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_bounties_guild_target 
            ON bounties(guild_id, target_dayz_name, status)
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_bounties_guild_status 
            ON bounties(guild_id, status)
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_bounties_placer 
            ON bounties(placer_user_id, status)
        `);
        console.log('✅ Indexes created');

        // Create bounty_claims table
        console.log('Creating bounty_claims table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS bounty_claims (
                id SERIAL PRIMARY KEY,
                bounty_id INTEGER REFERENCES bounties(id) ON DELETE CASCADE,
                killer_user_id VARCHAR(20),
                killer_dayz_name VARCHAR(100) NOT NULL,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                amount_paid INTEGER NOT NULL
            )
        `);
        console.log('✅ bounty_claims table created');

        // Create index for bounty claims
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_bounty_claims_killer 
            ON bounty_claims(killer_user_id)
        `);
        console.log('✅ bounty_claims index created');

        console.log('\n✅ Bounty system tables created successfully!');
        console.log('\nTables created:');
        console.log('  - bounties (stores active and historical bounties)');
        console.log('  - bounty_claims (tracks who claimed bounties and when)');
        console.log('\nBounty features:');
        console.log('  - Place bounties on players with /bounty place');
        console.log('  - Auto-claim when target is killed in killfeed');
        console.log('  - PVE/PVP zone awareness (respects server rules)');
        console.log('  - Anonymous bounties supported');
        console.log('  - Bounty stacking (multiple bounties on same target)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up bounty tables:', error);
        process.exit(1);
    }
}

setupBountyTables();
