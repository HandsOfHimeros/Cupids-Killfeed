// Migrate original server config to database
const { Pool } = require('pg');
const config = require('./config.json');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrateOriginalServer() {
    const client = await pool.connect();
    try {
        console.log('Migrating original server configuration...\n');
        
        const guildId = config.GUILDID;
        const serviceId = config.ID1;
        const instance = config.ID2;
        const token = config.NITRATOKEN;
        
        // Check if already exists
        const existing = await client.query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
        
        if (existing.rows.length > 0) {
            console.log('Original server already configured in database');
            console.log('Current config:', existing.rows[0]);
            return;
        }
        
        console.log('Inserting original server config...');
        console.log('Guild ID:', guildId);
        console.log('Service ID:', serviceId);
        console.log('Instance:', instance);
        
        await client.query(`
            INSERT INTO guild_configs (
                guild_id, 
                nitrado_service_id, 
                nitrado_instance, 
                nitrado_token,
                map_name,
                platform,
                restart_hours,
                timezone,
                economy_channel_id,
                shop_channel_id,
                killfeed_channel_id,
                connections_channel_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
            guildId,
            serviceId,
            instance,
            token,
            'chernarusplus',  // mapLoc=0 means chernarus
            'PS4',
            '8,11,14,17,20,23,2,5',
            'America/New_York',
            '1404621573498863806',  // Original economy channel
            '1392604466766807051',  // Original shop channel
            null,  // killfeed channel - will be set by setup if needed
            null   // connections channel - will be set by setup if needed
        ]);
        
        console.log('\n✅ Original server configuration migrated successfully!');
        console.log('Your original server should now work again.');
    } catch (error) {
        console.error('❌ Error migrating original server:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateOriginalServer().catch(console.error);
