const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupDistanceTracking() {
    try {
        console.log('Creating player_sessions table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_sessions (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                player_name TEXT NOT NULL,
                connected_at BIGINT NOT NULL,
                start_x FLOAT,
                start_y FLOAT,
                start_z FLOAT,
                last_x FLOAT,
                last_y FLOAT,
                last_z FLOAT,
                total_distance FLOAT DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(guild_id, player_name)
            )
        `);
        
        console.log('✅ Created player_sessions table');
        
        console.log('Creating index...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_active_sessions 
            ON player_sessions(guild_id, is_active)
        `);
        
        console.log('✅ Created index on player_sessions');
        
        await pool.end();
        console.log('\n✅ Distance tracking setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

setupDistanceTracking();
