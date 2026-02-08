require('dotenv').config();
const db = require('./database.js');

async function addPurchaseHistoryTable() {
    try {
        console.log('Creating purchase_history table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_history (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                dayz_player_name TEXT,
                item_name TEXT NOT NULL,
                item_class TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                total_cost INTEGER NOT NULL,
                purchase_timestamp BIGINT NOT NULL,
                restart_id TEXT,
                spawn_attempted BOOLEAN DEFAULT FALSE,
                spawn_success BOOLEAN DEFAULT NULL,
                spawn_error TEXT,
                spawn_coordinates TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ purchase_history table created successfully');
        
        // Create index for faster lookups
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_history_user 
            ON purchase_history(guild_id, user_id, purchase_timestamp DESC)
        `);
        
        console.log('✅ Indexes created');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating purchase_history table:', error);
        process.exit(1);
    }
}

addPurchaseHistoryTable();
