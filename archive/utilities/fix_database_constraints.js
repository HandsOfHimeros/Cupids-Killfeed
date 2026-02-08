// Fix database constraints for ON CONFLICT to work
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixConstraints() {
    const client = await pool.connect();
    try {
        console.log('Adding unique constraints to tables...');
        
        // Add unique constraints for multi-column keys
        await client.query(`
            ALTER TABLE balances 
            DROP CONSTRAINT IF EXISTS balances_guild_user_unique;
            
            ALTER TABLE balances 
            ADD CONSTRAINT balances_guild_user_unique UNIQUE (guild_id, user_id);
        `);
        console.log('✓ Added constraint to balances table');
        
        await client.query(`
            ALTER TABLE banks 
            DROP CONSTRAINT IF EXISTS banks_guild_user_unique;
            
            ALTER TABLE banks 
            ADD CONSTRAINT banks_guild_user_unique UNIQUE (guild_id, user_id);
        `);
        console.log('✓ Added constraint to banks table');
        
        await client.query(`
            ALTER TABLE cooldowns 
            DROP CONSTRAINT IF EXISTS cooldowns_guild_user_game_unique;
            
            ALTER TABLE cooldowns 
            ADD CONSTRAINT cooldowns_guild_user_game_unique UNIQUE (guild_id, user_id, game);
        `);
        console.log('✓ Added constraint to cooldowns table');
        
        await client.query(`
            ALTER TABLE dayz_names 
            DROP CONSTRAINT IF EXISTS dayz_names_guild_user_unique;
            
            ALTER TABLE dayz_names 
            ADD CONSTRAINT dayz_names_guild_user_unique UNIQUE (guild_id, user_id);
        `);
        console.log('✓ Added constraint to dayz_names table');
        
        await client.query(`
            ALTER TABLE player_locations 
            DROP CONSTRAINT IF EXISTS player_locations_guild_name_unique;
            
            ALTER TABLE player_locations 
            ADD CONSTRAINT player_locations_guild_name_unique UNIQUE (guild_id, player_name);
        `);
        console.log('✓ Added constraint to player_locations table');
        
        console.log('\n✅ All constraints added successfully!');
    } catch (error) {
        console.error('❌ Error fixing constraints:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixConstraints().catch(console.error);
