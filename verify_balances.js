const db = require('./database.js');

async function verifyBalances() {
    try {
        const client = await db.pool.connect();
        
        try {
            // Check balances for original server
            console.log('\n=== ORIGINAL SERVER (1386432422744162476) ===');
            const originalBalances = await client.query(
                'SELECT user_id, balance FROM balances WHERE guild_id = $1 ORDER BY balance DESC',
                ['1386432422744162476']
            );
            console.log(`Total players with balances: ${originalBalances.rows.length}`);
            for (const row of originalBalances.rows) {
                console.log(`  User ${row.user_id}: ${row.balance} coins`);
            }
            
            const originalBanks = await client.query(
                'SELECT user_id, bank FROM banks WHERE guild_id = $1 ORDER BY bank DESC',
                ['1386432422744162476']
            );
            console.log(`\nTotal players with banks: ${originalBanks.rows.length}`);
            for (const row of originalBanks.rows) {
                console.log(`  User ${row.user_id}: ${row.bank} coins in bank`);
            }
            
            // Check balances for new server
            console.log('\n\n=== NEW SERVER (1445943557020979274) ===');
            const newBalances = await client.query(
                'SELECT user_id, balance FROM balances WHERE guild_id = $1 ORDER BY balance DESC',
                ['1445943557020979274']
            );
            console.log(`Total players with balances: ${newBalances.rows.length}`);
            for (const row of newBalances.rows) {
                console.log(`  User ${row.user_id}: ${row.balance} coins`);
            }
            
            const newBanks = await client.query(
                'SELECT user_id, bank FROM banks WHERE guild_id = $1 ORDER BY bank DESC',
                ['1445943557020979274']
            );
            console.log(`\nTotal players with banks: ${newBanks.rows.length}`);
            for (const row of newBanks.rows) {
                console.log(`  User ${row.user_id}: ${row.bank} coins in bank`);
            }
            
            console.log('\n✅ All economy data verified!');
            
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyBalances();
