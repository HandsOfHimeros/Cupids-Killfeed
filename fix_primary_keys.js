// Fix primary keys to include guild_id for multi-server support
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixPrimaryKeys() {
    const client = await pool.connect();
    try {
        console.log('Fixing primary keys for multi-server support...\n');
        
        // Fix balances table
        console.log('Updating balances table...');
        await client.query(`ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_pkey`);
        await client.query(`ALTER TABLE balances ADD PRIMARY KEY (guild_id, user_id)`);
        console.log('✓ balances table updated');
        
        // Fix banks table
        console.log('Updating banks table...');
        await client.query(`ALTER TABLE banks DROP CONSTRAINT IF EXISTS banks_pkey`);
        await client.query(`ALTER TABLE banks ADD PRIMARY KEY (guild_id, user_id)`);
        console.log('✓ banks table updated');
        
        // Fix cooldowns table
        console.log('Updating cooldowns table...');
        await client.query(`ALTER TABLE cooldowns DROP CONSTRAINT IF EXISTS cooldowns_pkey`);
        // Cooldowns doesn't need a primary key, just an index for efficient lookups
        await client.query(`CREATE INDEX IF NOT EXISTS idx_cooldowns_guild_user_game ON cooldowns (guild_id, user_id, game_name)`);
        console.log('✓ cooldowns table updated');
        
        // Fix dayz_names table
        console.log('Updating dayz_names table...');
        await client.query(`ALTER TABLE dayz_names DROP CONSTRAINT IF EXISTS dayz_names_pkey`);
        await client.query(`ALTER TABLE dayz_names ADD PRIMARY KEY (guild_id, user_id)`);
        console.log('✓ dayz_names table updated');
        
        // Fix player_locations table
        console.log('Updating player_locations table...');
        await client.query(`ALTER TABLE player_locations DROP CONSTRAINT IF EXISTS player_locations_pkey`);
        await client.query(`ALTER TABLE player_locations ADD PRIMARY KEY (guild_id, steam_id)`);
        console.log('✓ player_locations table updated');
        
        console.log('\n✅ All primary keys fixed successfully!');
    } catch (error) {
        console.error('❌ Error fixing primary keys:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixPrimaryKeys().catch(console.error);
