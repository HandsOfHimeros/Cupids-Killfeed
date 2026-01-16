// Setup kit tables locally
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupKitTables() {
    try {
        console.log('Creating kit_purchases table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS kit_purchases (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                kit_name VARCHAR(100) NOT NULL,
                weapon_variant VARCHAR(100) NOT NULL,
                attachments JSONB NOT NULL,
                total_cost INTEGER NOT NULL,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                spawned BOOLEAN DEFAULT FALSE,
                spawned_at TIMESTAMP,
                UNIQUE(guild_id, user_id, id)
            );
        `);
        
        console.log('Creating indexes...');
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_kit_purchases_guild_user 
            ON kit_purchases(guild_id, user_id);
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_kit_purchases_spawned 
            ON kit_purchases(spawned);
        `);
        
        console.log('✅ Kit tables created successfully!');
        console.log('Tables will only be used by your test guild:', process.env.TEST_GUILD_ID);
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

setupKitTables();
