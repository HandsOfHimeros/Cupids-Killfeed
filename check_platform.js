require('dotenv').config();
const db = require('./database.js');

(async () => {
    try {
        console.log('=== GUILD_CONFIGS TABLE SCHEMA ===\n');
        
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'guild_configs' 
            ORDER BY ordinal_position
        `);
        
        result.rows.forEach(r => {
            console.log(`${r.column_name}: ${r.data_type}`);
        });
        
        console.log('\n=== CURRENT GUILD CONFIGS ===\n');
        
        const configs = await db.query('SELECT guild_id, platform FROM guild_configs');
        configs.rows.forEach(c => {
            console.log(`Guild ${c.guild_id}: platform = ${c.platform || 'not set'}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
