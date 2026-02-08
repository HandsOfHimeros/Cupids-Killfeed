require('dotenv').config();
const db = require('./database.js');

async function testBountySystem() {
    try {
        console.log('=== BOUNTY SYSTEM TEST ===\n');
        
        // Get guild config
        const guilds = await db.query('SELECT guild_id FROM guild_configs LIMIT 1');
        if (guilds.rows.length === 0) {
            console.log('❌ No guild configs found');
            process.exit(1);
        }
        
        const guildId = guilds.rows[0].guild_id;
        console.log(`✅ Testing with Guild ID: ${guildId}\n`);
        
        // Check if bounties table exists and has data
        console.log('--- Checking Bounties Table ---');
        const bountyCheck = await db.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'bounties'
        `);
        
        if (bountyCheck.rows[0].count === '0') {
            console.log('❌ bounties table does not exist!');
            console.log('   Run: node setup_bounty_tables.js');
            process.exit(1);
        }
        console.log('✅ bounties table exists\n');
        
        // Check for active bounties
        console.log('--- Active Bounties ---');
        const activeBounties = await db.query(`
            SELECT b.id, b.target_dayz_name, b.amount, b.placer_user_id, 
                   b.status, b.anonymous
            FROM bounties b
            WHERE b.guild_id = $1 AND b.status = 'active'
            ORDER BY b.created_at DESC
        `, [guildId]);
        
        if (activeBounties.rows.length === 0) {
            console.log('⚠️  No active bounties found');
            console.log('   Create a bounty using: /bounty place');
        } else {
            console.log(`✅ Found ${activeBounties.rows.length} active bounty(ies):`);
            activeBounties.rows.forEach(b => {
                const placer = b.anonymous ? 'Anonymous' : (b.placer_user_id || 'Unknown');
                console.log(`   - Target: ${b.target_dayz_name} | Amount: $${b.amount.toLocaleString()} | Placer: ${placer}`);
            });
        }
        console.log();
        
        // Check dayz_names table
        console.log('--- Linked DayZ Names ---');
        const linkedNames = await db.query(`
            SELECT dn.dayz_name, dn.user_id
            FROM dayz_names dn
            WHERE dn.guild_id = $1
            ORDER BY dn.dayz_name
        `, [guildId]);
        
        if (linkedNames.rows.length === 0) {
            console.log('⚠️  No DayZ names linked');
            console.log('   Link your name using: /dayzname set');
        } else {
            console.log(`✅ Found ${linkedNames.rows.length} linked name(s):`);
            linkedNames.rows.forEach(ln => {
                console.log(`   - ${ln.dayz_name} → ${ln.user_id}`);
            });
        }
        console.log();
        
        // Check bounty_claims table
        console.log('--- Bounty Claims History ---');
        const claimsCheck = await db.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'bounty_claims'
        `);
        
        if (claimsCheck.rows[0].count === '0') {
            console.log('❌ bounty_claims table does not exist!');
        } else {
            const recentClaims = await db.query(`
                SELECT bc.bounty_id, bc.killer_dayz_name, bc.amount_paid, bc.claimed_at,
                       b.target_dayz_name
                FROM bounty_claims bc
                JOIN bounties b ON bc.bounty_id = b.id
                WHERE b.guild_id = $1
                ORDER BY bc.claimed_at DESC
                LIMIT 5
            `, [guildId]);
            
            if (recentClaims.rows.length === 0) {
                console.log('ℹ️  No bounty claims yet');
            } else {
                console.log(`✅ Recent claims:`);
                recentClaims.rows.forEach(c => {
                    const date = new Date(c.claimed_at).toLocaleString();
                    console.log(`   - ${c.killer_dayz_name} killed ${c.target_dayz_name} → $${c.amount_paid.toLocaleString()} (${date})`);
                });
            }
        }
        console.log();
        
        // Test bounty claim logic
        console.log('--- Testing Bounty Claim Logic ---');
        if (activeBounties.rows.length > 0) {
            const testTarget = activeBounties.rows[0].target_dayz_name;
            console.log(`Testing with target: ${testTarget}`);
            
            // Check if killer has linked name
            const testKiller = linkedNames.rows.find(ln => ln.dayz_name.toLowerCase() !== testTarget.toLowerCase());
            if (!testKiller) {
                console.log('⚠️  No other linked players to test with');
                console.log('   Need at least 2 players with linked DayZ names');
            } else {
                console.log(`Test killer: ${testKiller.dayz_name} (${testKiller.user_id})`);
                
                // Check what would happen
                const matchingBounties = await db.getActiveBountiesForTarget(guildId, testTarget);
                console.log(`✅ Would claim ${matchingBounties.length} bounty(ies) worth $${matchingBounties.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}`);
            }
        }
        console.log();
        
        console.log('=== TEST COMPLETE ===\n');
        console.log('📋 CHECKLIST FOR BOUNTY CLAIMS:');
        console.log('   1. ✓ Bounties table exists');
        console.log('   2. ' + (activeBounties.rows.length > 0 ? '✓' : '✗') + ' Active bounties exist');
        console.log('   3. ' + (linkedNames.rows.length >= 2 ? '✓' : '✗') + ' At least 2 players have linked DayZ names');
        console.log('   4. ✓ Kill must be player vs player (isPlayerKill=true)');
        console.log('   5. ✓ Killer must have linked DayZ name to receive money');
        console.log('   6. ✓ Kill must not violate PVE/safe zone rules');
        console.log();
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testBountySystem();
