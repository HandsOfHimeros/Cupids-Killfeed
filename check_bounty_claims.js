require('dotenv').config();
const db = require('./database.js');

(async () => {
    try {
        console.log('=== BOUNTY CLAIMS CHECK ===\n');
        
        // Check if any claims exist
        const claims = await db.query(
            "SELECT * FROM bounty_claims ORDER BY claimed_at DESC LIMIT 10"
        );
        
        console.log('Total bounty claims in database:', claims.rows.length);
        if (claims.rows.length > 0) {
            claims.rows.forEach(c => {
                console.log(`- Bounty ${c.bounty_id}: ${c.killer_dayz_name} claimed $${c.amount_paid.toLocaleString()} on ${c.claimed_at}`);
            });
        } else {
            console.log('❌ No bounty claims found\n');
        }
        
        console.log('\n=== LINKED DAYZ NAMES FOR DEV GUILD ===\n');
        
        // Check linked names
        const names = await db.query(
            "SELECT dayz_name, user_id FROM dayz_names WHERE guild_id = '1461070029175918662' ORDER BY dayz_name"
        );
        
        console.log('Players with linked DayZ names:', names.rows.length);
        names.rows.forEach(n => {
            console.log(`- ${n.dayz_name} → User ID: ${n.user_id}`);
        });
        
        console.log('\n=== CHECKING YOUR DAYZ NAME ===\n');
        
        // Check if the user who placed bounties has their name linked
        const placerCheck = await db.query(
            "SELECT dayz_name FROM dayz_names WHERE guild_id = '1461070029175918662' AND user_id = '1385045856612519967'"
        );
        
        if (placerCheck.rows.length > 0) {
            console.log(`✅ Your DayZ name is linked: ${placerCheck.rows[0].dayz_name}`);
        } else {
            console.log('❌ You do not have a linked DayZ name');
            console.log('   You need to link your name with /linkname to receive bounty rewards');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
