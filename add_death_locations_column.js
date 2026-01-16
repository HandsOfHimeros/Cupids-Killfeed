const db = require('./database.js');

async function addDeathLocColumn() {
    try {
        console.log('Adding show_death_locations column to guild_configs...');
        
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS show_death_locations BOOLEAN DEFAULT true
        `);
        
        console.log('✓ Column added successfully');
        console.log('✓ Default value: true (death locations will show by default)');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

addDeathLocColumn();
