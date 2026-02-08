const db = require('./database.js');

(async () => {
    try {
        console.log('Checking base_alert_history for base 34 and HandsOfHimeros...\n');
        
        const result = await db.query(`
            SELECT id, base_alert_id, detected_player_name, distance, event_type, 
                   alerted_at, detected_at
            FROM base_alert_history 
            WHERE base_alert_id = 34 
            AND detected_player_name = 'HandsOfHimeros'
            ORDER BY detected_at DESC 
            LIMIT 10
        `);
        
        console.log(`Found ${result.rows.length} records:\n`);
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`  Player: ${row.detected_player_name}`);
            console.log(`  Distance: ${row.distance}m`);
            console.log(`  Event Type: ${row.event_type}`);
            console.log(`  Alerted At: ${row.alerted_at}`);
            console.log(`  Detected At: ${row.detected_at}`);
            console.log('');
        });
        
        // Also check base alert config
        console.log('\nChecking base alert #34 configuration:\n');
        const baseConfig = await db.query(`
            SELECT * FROM base_alerts WHERE id = 34
        `);
        
        if (baseConfig.rows.length > 0) {
            const base = baseConfig.rows[0];
            console.log(`Base ID: ${base.id}`);
            console.log(`Guild ID: ${base.guild_id}`);
            console.log(`Owner Discord ID: ${base.owner_discord_id}`);
            console.log(`Map: ${base.map_name}`);
            console.log(`Location: (${base.base_x}, ${base.base_y})`);
            console.log(`Radius: ${base.alert_radius}m`);
            console.log(`Created: ${base.created_at}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
