const db = require('./database.js');

(async () => {
    try {
        console.log('Deleting base_alert_history records for base 34 and HandsOfHimeros...\n');
        
        const result = await db.query(
            'DELETE FROM base_alert_history WHERE base_alert_id = 34 AND detected_player_name = $1 RETURNING *',
            ['HandsOfHimeros']
        );
        
        console.log(`Deleted ${result.rowCount} records:\n`);
        result.rows.forEach(row => {
            console.log(`  ID ${row.id}: ${row.detected_player_name} at ${row.distance}m (detected at ${row.detected_at})`);
        });
        
        console.log('\nHistory cleared. Next detection should send a fresh alert.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
