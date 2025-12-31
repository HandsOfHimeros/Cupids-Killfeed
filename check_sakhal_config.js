const db = require('./database.js');

async function checkSakhalConfig() {
    try {
        const client = await db.pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM guild_configs WHERE guild_id = $1',
                ['1445957198000820316']
            );
            
            if (result.rows.length === 0) {
                console.log('❌ Sakhal server not found in database!');
            } else {
                const config = result.rows[0];
                console.log('\n=== SAKHAL SERVER CONFIG ===');
                console.log(JSON.stringify(config, null, 2));
            }
            
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSakhalConfig();
