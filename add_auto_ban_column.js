// Migration script to add auto_ban_on_kill column to guild_configs
require('dotenv').config();
const db = require('./database.js');

async function addAutoBanColumn() {
    try {
        console.log('Adding auto_ban_on_kill column to guild_configs table...');
        
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS auto_ban_on_kill BOOLEAN DEFAULT false
        `);
        
        console.log('✅ Successfully added auto_ban_on_kill column');
        console.log('   Default value: false (auto-ban disabled)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding auto_ban_on_kill column:', error);
        process.exit(1);
    }
}

addAutoBanColumn();
