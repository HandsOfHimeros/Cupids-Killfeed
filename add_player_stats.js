// Database migration to add player stats tracking for K/D system
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addPlayerStats() {
    try {
        console.log('Creating player_stats table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_stats (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                player_name VARCHAR(255) NOT NULL,
                kills INTEGER DEFAULT 0,
                deaths INTEGER DEFAULT 0,
                zombie_deaths INTEGER DEFAULT 0,
                player_deaths INTEGER DEFAULT 0,
                suicide_deaths INTEGER DEFAULT 0,
                environmental_deaths INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, player_name)
            )
        `);
        
        console.log('✅ Created player_stats table');
        
        console.log('Creating index on guild_id...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_player_stats_guild 
            ON player_stats(guild_id)
        `);
        
        console.log('✅ Created index');
        
        console.log('🎉 Player stats table created successfully!');
        console.log('\nNow you can track:');
        console.log('  - Total kills');
        console.log('  - Total deaths');
        console.log('  - Deaths by zombies');
        console.log('  - Deaths by players');
        console.log('  - Suicides');
        console.log('  - Environmental deaths');
        
    } catch (error) {
        console.error('Error creating player_stats table:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('\nMigration complete!');
    }
}

if (require.main === module) {
    addPlayerStats()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = addPlayerStats;
