// Fix guild_id for original server's data
const { Pool } = require('pg');
const config = require('./config.json');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixOriginalGuildId() {
    const client = await pool.connect();
    try {
        console.log('Fixing guild_id for original server data...\n');
        
        const defaultGuildId = '1392564838925914142';  // Old default
        const correctGuildId = config.GUILDID;  // Actual original server ID
        
        console.log('Updating from default:', defaultGuildId);
        console.log('To correct guild ID:', correctGuildId);
        console.log('');
        
        // First, merge balances (keep the higher balance)
        console.log('Merging balances...');
        const mergeBalances = await client.query(`
            INSERT INTO balances (guild_id, user_id, balance)
            SELECT $1, user_id, balance
            FROM balances
            WHERE guild_id = $2
            ON CONFLICT (guild_id, user_id) 
            DO UPDATE SET balance = GREATEST(balances.balance, EXCLUDED.balance)
            RETURNING user_id, balance
        `, [correctGuildId, defaultGuildId]);
        console.log(`✓ Merged ${mergeBalances.rows.length} balances`);
        
        // Delete old default guild balances
        await client.query('DELETE FROM balances WHERE guild_id = $1', [defaultGuildId]);
        console.log(`✓ Cleaned up old balance records`);
        
        // Merge banks (keep the higher amount)
        console.log('Merging bank accounts...');
        const mergeBanks = await client.query(`
            INSERT INTO banks (guild_id, user_id, bank_balance)
            SELECT $1, user_id, bank_balance
            FROM banks
            WHERE guild_id = $2
            ON CONFLICT (guild_id, user_id) 
            DO UPDATE SET bank_balance = GREATEST(banks.bank_balance, EXCLUDED.bank_balance)
            RETURNING user_id, bank_balance
        `, [correctGuildId, defaultGuildId]);
        console.log(`✓ Merged ${mergeBanks.rows.length} bank accounts`);
        
        // Delete old default guild banks
        await client.query('DELETE FROM banks WHERE guild_id = $1', [defaultGuildId]);
        console.log(`✓ Cleaned up old bank records`);
        
        // Update cooldowns
        const cooldowns = await client.query(
            'UPDATE cooldowns SET guild_id = $1 WHERE guild_id = $2 RETURNING user_id',
            [correctGuildId, defaultGuildId]
        );
        console.log(`✓ Updated ${cooldowns.rows.length} cooldown records`);
        
        // Update dayz_names
        const names = await client.query(
            'UPDATE dayz_names SET guild_id = $1 WHERE guild_id = $2 RETURNING user_id, dayz_name',
            [correctGuildId, defaultGuildId]
        );
        console.log(`✓ Updated ${names.rows.length} DayZ names`);
        
        // Update player_locations
        const locations = await client.query(
            'UPDATE player_locations SET guild_id = $1 WHERE guild_id = $2 RETURNING player_name',
            [correctGuildId, defaultGuildId]
        );
        console.log(`✓ Updated ${locations.rows.length} player locations`);
        
        console.log('\n✅ All original server data migrated successfully!');
        console.log('Your player balances should be restored.');
    } catch (error) {
        console.error('❌ Error fixing guild_id:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixOriginalGuildId().catch(console.error);
