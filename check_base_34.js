const db = require('./database.js');

(async () => {
    try {
        console.log('Checking base alert #34 details:\n');
        
        const result = await db.query('SELECT * FROM base_alerts WHERE id = 34');
        
        if (result.rows.length === 0) {
            console.log('Base alert #34 not found!');
            process.exit(1);
        }
        
        const base = result.rows[0];
        console.log('Full base alert data:');
        for (const [key, value] of Object.entries(base)) {
            console.log(`  ${key}: ${value}`);
        }
        
        console.log('\n--- Analysis ---');
        if (!base.owner_discord_id) {
            console.log('⚠️  owner_discord_id is NULL or undefined!');
            console.log('This is why no DM can be sent.');
        } else {
            console.log(`✓ Owner Discord ID: ${base.owner_discord_id}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
