const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupSubscriptions() {
    try {
        console.log('🔧 Setting up subscription system tables...\n');
        
        // Create subscriptions table
        console.log('Creating subscriptions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                guild_id VARCHAR(20) PRIMARY KEY,
                stripe_customer_id VARCHAR(255),
                stripe_subscription_id VARCHAR(255),
                plan_tier VARCHAR(50) DEFAULT 'free',
                status VARCHAR(50) DEFAULT 'inactive',
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                trial_end TIMESTAMP,
                canceled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Created subscriptions table\n');
        
        // Create subscription_plans table
        console.log('Creating subscription_plans table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscription_plans (
                plan_id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price_monthly DECIMAL(10,2) NOT NULL,
                features JSONB,
                stripe_price_id VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Created subscription_plans table\n');
        
        // Insert default plans
        console.log('Inserting default subscription plans...');
        await pool.query(`
            INSERT INTO subscription_plans (plan_id, name, price_monthly, features, stripe_price_id, is_active)
            VALUES 
                ('free', 'Free Tier', 0.00, 
                 '["killfeed", "kd_stats", "leaderboards", "distance_tracking", "basic_economy", "daily_rewards", "3_starter_games"]'::jsonb,
                 NULL, true),
                ('premium', 'Premium', 5.00,
                 '["all_free_features", "shop_system", "all_mini_games", "bounty_system", "raid_weekend", "teleport_system", "base_alerts", "trader_system", "properties", "achievements", "auto_ban", "admin_tools"]'::jsonb,
                 NULL, true)
            ON CONFLICT (plan_id) DO NOTHING
        `);
        console.log('✅ Inserted default plans\n');
        
        // Create indexes
        console.log('Creating indexes...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
            ON subscriptions(status);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer 
            ON subscriptions(stripe_customer_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription 
            ON subscriptions(stripe_subscription_id);
        `);
        console.log('✅ Created indexes\n');
        
        // Initialize all existing guilds with free tier
        console.log('Initializing existing guilds with free tier...');
        const result = await pool.query(`
            INSERT INTO subscriptions (guild_id, plan_tier, status)
            SELECT guild_id, 'free', 'active'
            FROM guild_configs
            WHERE guild_id NOT IN (SELECT guild_id FROM subscriptions)
        `);
        console.log(`✅ Initialized ${result.rowCount} guilds with free tier\n`);
        
        // Set owner's servers to premium
        console.log('Setting owner servers to premium...');
        const ownerServers = ['1386432422744162476', '1445943557020979274', '1445957198000820316'];
        const premiumResult = await pool.query(`
            UPDATE subscriptions 
            SET plan_tier = 'premium', status = 'active'
            WHERE guild_id = ANY($1)
        `, [ownerServers]);
        console.log(`✅ Set ${premiumResult.rowCount} owner servers to premium\n`);
        
        // Display current plans
        console.log('📋 Current Subscription Plans:');
        const plans = await pool.query('SELECT * FROM subscription_plans ORDER BY price_monthly');
        for (const plan of plans.rows) {
            console.log(`\n  ${plan.name} (${plan.plan_id})`);
            console.log(`  Price: $${plan.price_monthly}/month`);
            console.log(`  Active: ${plan.is_active ? '✅' : '❌'}`);
            console.log(`  Features: ${plan.features.length} features`);
        }
        
        console.log('\n✅ Subscription system setup complete!');
        console.log('\n📝 Next Steps:');
        console.log('  1. Set up Stripe account and get API keys');
        console.log('  2. Create Stripe price ID for premium plan');
        console.log('  3. Update subscription_plans table with stripe_price_id');
        console.log('  4. Add subscription checks to premium commands');
        console.log('  5. Create /subscribe and /subscription commands\n');
        
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

setupSubscriptions();
