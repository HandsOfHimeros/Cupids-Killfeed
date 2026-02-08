// Add guild_configs table for multi-server support
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addGuildConfigsTable() {
    const client = await pool.connect();
    try {
        console.log('Creating guild_configs table...');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS guild_configs (
                guild_id VARCHAR(20) PRIMARY KEY,
                nitrado_service_id VARCHAR(20) NOT NULL,
                nitrado_instance VARCHAR(50) NOT NULL,
                nitrado_token TEXT NOT NULL,
                map_name VARCHAR(50) NOT NULL DEFAULT 'chernarusplus',
                platform VARCHAR(20) NOT NULL DEFAULT 'PS4',
                economy_channel_id VARCHAR(20),
                shop_channel_id VARCHAR(20),
                killfeed_channel_id VARCHAR(20),
                connections_channel_id VARCHAR(20),
                restart_hours TEXT NOT NULL DEFAULT '8,11,14,17,20,23,2,5',
                timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✓ guild_configs table created successfully');
        
        // Update existing tables to include guild_id if not already present
        console.log('Adding guild_id to existing tables...');
        
        await client.query(`
            ALTER TABLE balances 
            ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20) DEFAULT '1392564838925914142'
        `);
        
        await client.query(`
            ALTER TABLE banks 
            ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20) DEFAULT '1392564838925914142'
        `);
        
        await client.query(`
            ALTER TABLE cooldowns 
            ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20) DEFAULT '1392564838925914142'
        `);
        
        await client.query(`
            ALTER TABLE dayz_names 
            ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20) DEFAULT '1392564838925914142'
        `);
        
        await client.query(`
            ALTER TABLE player_locations 
            ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20) DEFAULT '1392564838925914142'
        `);
        
        console.log('✓ guild_id columns added to all tables');
        
        console.log('\nAll database updates completed successfully!');
    } catch (error) {
        console.error('Error updating database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addGuildConfigsTable().catch(console.error);
