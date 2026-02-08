// Database migration to add throne system for King battles
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addThroneSystem() {
    try {
        console.log('Creating reigning_king table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reigning_king (
                guild_id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                crowned_at BIGINT NOT NULL,
                defense_count INTEGER DEFAULT 0,
                last_challenged BIGINT DEFAULT 0
            )
        `);
        
        console.log('✅ Created reigning_king table');
        
        console.log('Creating throne_challenges table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS throne_challenges (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                challenger_id VARCHAR(255) NOT NULL,
                king_id VARCHAR(255) NOT NULL,
                challenged_at BIGINT NOT NULL,
                outcome VARCHAR(50) NOT NULL,
                wager INTEGER NOT NULL,
                winner_id VARCHAR(255)
            )
        `);
        
        console.log('✅ Created throne_challenges table');
        
        console.log('Creating indexes...');
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_throne_challenges_guild 
            ON throne_challenges(guild_id)
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_throne_challenges_challenger 
            ON throne_challenges(challenger_id)
        `);
        
        console.log('✅ Created indexes');
        
        console.log('');
        console.log('🎉 Throne system tables created successfully!');
        console.log('');
        console.log('Tables added:');
        console.log('  - reigning_king (tracks current throne holder per guild)');
        console.log('  - throne_challenges (tracks challenge history)');
        console.log('');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating throne system tables:', err);
        process.exit(1);
    }
}

addThroneSystem();
