require('dotenv').config();
const db = require('./database.js');

async function addTraderSystem() {
    console.log('Creating active_traders table...');
    
    try {
        // Create active_traders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS active_traders (
                trader_id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
                hours_open VARCHAR(255) NOT NULL,
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, user_id)
            )
        `);
        
        console.log('✅ Created active_traders table');
        
        // Create index for faster lookups
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_active_traders_guild 
            ON active_traders(guild_id)
        `);
        
        console.log('✅ Created index on guild_id');
        
        console.log('\n🎉 Trader system tables created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating trader tables:', error);
        throw error;
    }
}

addTraderSystem()
    .then(() => {
        console.log('Migration complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
