require('dotenv').config();
const db = require('./database.js');

(async () => {
    try {
        const result = await db.query(
            'SELECT guild_id, nitrado_token, nitrado_service_id, map_name FROM guild_configs WHERE guild_id = $1',
            ['1445943557020979274']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Guild Config Found:');
            console.log('  guild_id:', result.rows[0].guild_id);
            console.log('  nitrado_token:', result.rows[0].nitrado_token ? `✅ SET (length: ${result.rows[0].nitrado_token.length})` : '❌ NOT SET');
            console.log('  nitrado_service_id:', result.rows[0].nitrado_service_id || '❌ NOT SET');
            console.log('  map_name:', result.rows[0].map_name || '❌ NOT SET');
            
            if (!result.rows[0].nitrado_token || !result.rows[0].nitrado_service_id) {
                console.log('\n⚠️  Missing Nitrado configuration!');
                console.log('Run /admin setup in your dev Discord server to configure Nitrado.');
            }
        } else {
            console.log('❌ No guild config found for guild 1445943557020979274!');
            console.log('\n💡 Run /admin setup in your dev Discord server first.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
