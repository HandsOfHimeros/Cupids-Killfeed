const db = require('./database.js');

const guildIdToRemove = '1392564838925914142';

async function removeGuild() {
    try {
        console.log(`\nRemoving guild ${guildIdToRemove} from database...`);
        
        // Delete from all tables
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete guild config
            await client.query('DELETE FROM guild_configs WHERE guild_id = $1', [guildIdToRemove]);
            console.log('Deleted from guild_configs');
            
            // Delete economy data
            await client.query('DELETE FROM balances WHERE guild_id = $1', [guildIdToRemove]);
            console.log('Deleted from balances');
            
            await client.query('DELETE FROM banks WHERE guild_id = $1', [guildIdToRemove]);
            console.log('Deleted from banks');
            
            await client.query('DELETE FROM dayz_names WHERE guild_id = $1', [guildIdToRemove]);
            console.log('Deleted from dayz_names');
            
            await client.query('COMMIT');
            console.log('\n✅ Successfully removed guild ' + guildIdToRemove);
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeGuild();
