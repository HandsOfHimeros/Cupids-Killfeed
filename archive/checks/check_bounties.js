const db = require('./database.js');

(async () => {
    try {
        const result = await db.query(
            'SELECT player_name, bounty_amount, placed_by, reason FROM bounties WHERE guild_id = $1 AND claimed = false',
            ['1461070029175918662']
        );
        
        console.log(`Active bounties: ${result.rowCount}`);
        if (result.rowCount > 0) {
            result.rows.forEach(b => {
                console.log(`  - ${b.player_name}: $${b.bounty_amount} (placed by ${b.placed_by})`);
                console.log(`    Reason: ${b.reason || 'None'}`);
            });
        } else {
            console.log('  No active bounties found');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
})();
