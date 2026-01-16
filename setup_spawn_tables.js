// Setup database table for player spawn tables
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function setupSpawnTables() {
    const client = await pool.connect();
    try {
        console.log('Creating player_spawn_tables table...');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS player_spawn_tables (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                dayz_player_name TEXT NOT NULL,
                map_name TEXT NOT NULL,
                table_x REAL NOT NULL,
                table_y REAL NOT NULL,
                table_z REAL NOT NULL,
                table_ypr TEXT DEFAULT '[90,0,0]',
                item_count INTEGER DEFAULT 0,
                restart_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, dayz_player_name, map_name)
            );
        `);
        
        console.log('✅ player_spawn_tables table created successfully');
        
        // Create index for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_spawn_tables_lookup 
            ON player_spawn_tables(guild_id, dayz_player_name, map_name);
        `);
        
        console.log('✅ Index created');
        
    } catch (error) {
        console.error('Error setting up spawn tables:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

setupSpawnTables();
