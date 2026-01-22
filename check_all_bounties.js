require('dotenv').config();
const db = require('./database.js');

(async () => {
    try {
        const result = await db.query(
            "SELECT id, target_dayz_name, amount, status FROM bounties WHERE guild_id = '1461070029175918662' ORDER BY created_at DESC"
        );
        
        console.log('Total bounties for dev guild:', result.rows.length);
        console.log('');
        
        let totalActive = 0;
        result.rows.forEach(b => {
            console.log(`[${b.status.toUpperCase()}] ${b.target_dayz_name}: $${b.amount.toLocaleString()}`);
            if (b.status === 'active') totalActive += b.amount;
        });
        
        console.log('');
        console.log('Total ACTIVE bounty value: $' + totalActive.toLocaleString());
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
