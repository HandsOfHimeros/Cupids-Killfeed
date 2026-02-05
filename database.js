// Database helper for PostgreSQL operations
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Increased timeouts to prevent premature connection failures
    connectionTimeoutMillis: 30000, // 30 seconds (was 5)
    query_timeout: 30000, // 30 seconds (was 10)
    idle_in_transaction_session_timeout: 30000, // 30 seconds
    statement_timeout: 30000, // 30 seconds
    // Connection pool limits to prevent exhaustion
    max: 10, // Maximum 10 connections (Heroku free tier limit is 20)
    min: 2, // Keep 2 connections alive
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    allowExitOnIdle: false,
    // Enable keep-alive to prevent connection drops
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// Track pool metrics
let poolMetrics = {
    totalConnections: 0,
    activeQueries: 0,
    errors: 0,
    lastError: null
};

// Test database connection on startup
pool.on('error', (err) => {
    poolMetrics.errors++;
    poolMetrics.lastError = { time: new Date(), message: err.message };
    console.error('[DATABASE] ❌ Unexpected error on idle client:', err.message);
    console.error('[DATABASE] Pool metrics:', JSON.stringify(poolMetrics));
});

pool.on('connect', () => {
    poolMetrics.totalConnections++;
    console.log('[DATABASE] ✓ New client connected to pool (total: ' + poolMetrics.totalConnections + ')');
});

pool.on('acquire', () => {
    poolMetrics.activeQueries++;
});

pool.on('remove', () => {
    console.log('[DATABASE] Client removed from pool');
});

// Test connection function with retry
async function testConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const start = Date.now();
            const result = await pool.query('SELECT NOW()');
            const duration = Date.now() - start;
            console.log('[DATABASE] ✅ Connection successful! Server time:', result.rows[0].now);
            console.log('[DATABASE] Query latency:', duration + 'ms');
            console.log('[DATABASE] Pool size:', pool.totalCount, '| Idle:', pool.idleCount, '| Waiting:', pool.waitingCount);
            return true;
        } catch (error) {
            console.error('[DATABASE] ❌ Connection attempt ' + (i + 1) + '/' + retries + ' failed:', error.message);
            if (i < retries - 1) {
                console.log('[DATABASE] Retrying in 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    console.error('[DATABASE] ❌ All connection attempts failed!');
    return false;
}

// Call test on startup
testConnection().catch(err => console.error('[DATABASE] Test connection error:', err));

// Safe query wrapper with timeout handling and retries
async function safeQuery(queryText, params = [], retries = 2) {
    const startTime = Date.now();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await pool.query(queryText, params);
            const duration = Date.now() - startTime;
            
            // Warn on slow queries
            if (duration > 5000) {
                console.warn('[DATABASE] ⚠️ SLOW QUERY (' + duration + 'ms):', queryText.substring(0, 100));
            }
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Log the error with context
            console.error('[DATABASE] ❌ Query failed (attempt ' + (attempt + 1) + '/' + (retries + 1) + ', ' + duration + 'ms):');
            console.error('[DATABASE] Error:', error.message);
            console.error('[DATABASE] Query:', queryText.substring(0, 150));
            console.error('[DATABASE] Pool state - Total:', pool.totalCount, 'Idle:', pool.idleCount, 'Waiting:', pool.waitingCount);
            
            // Don't retry on certain errors
            if (error.message.includes('syntax error') || 
                error.message.includes('does not exist') ||
                error.message.includes('duplicate key')) {
                throw error; // These are permanent errors, don't retry
            }
            
            // Retry on timeout/connection errors
            if (attempt < retries) {
                const backoffMs = (attempt + 1) * 1000; // 1s, 2s backoff
                console.log('[DATABASE] Retrying in ' + backoffMs + 'ms...');
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            } else {
                // All retries exhausted
                throw new Error('Database query failed after ' + (retries + 1) + ' attempts: ' + error.message);
            }
        }
    }
}

// Guild Config operations
async function getGuildConfig(guildId) {
    const result = await safeQuery('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
    return result.rows[0] || null;
}

async function setGuildConfig(guildId, config) {
    const { nitratoServiceId, nitratoInstance, nitratoToken, mapName, platform, restartHours, timezone } = config;
    await safeQuery(`
        INSERT INTO guild_configs (guild_id, nitrado_service_id, nitrado_instance, nitrado_token, map_name, platform, restart_hours, timezone, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) 
        ON CONFLICT (guild_id) DO UPDATE SET 
            nitrado_service_id = $2,
            nitrado_instance = $3,
            nitrado_token = $4,
            map_name = $5,
            platform = $6,
            restart_hours = $7,
            timezone = $8,
            updated_at = CURRENT_TIMESTAMP
    `, [guildId, nitratoServiceId, nitratoInstance, nitratoToken, mapName, platform, restartHours, timezone]);
}

async function setGuildChannels(guildId, channels) {
    const { economyChannel, shopChannel, killfeedChannel, connectionsChannel, buildChannel, suicideChannel } = channels;
    await safeQuery(`
        UPDATE guild_configs 
        SET economy_channel_id = $2,
            shop_channel_id = $3,
            killfeed_channel_id = $4,
            connections_channel_id = $5,
            build_channel_id = $6,
            suicide_channel_id = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = $1
    `, [guildId, economyChannel, shopChannel, killfeedChannel, connectionsChannel, buildChannel, suicideChannel]);
}

async function getAllGuildConfigs() {
    const result = await safeQuery('SELECT * FROM guild_configs');
    return result.rows;
}

async function updateKillfeedState(guildId, lastLogLine) {
    await safeQuery(`
        UPDATE guild_configs 
        SET last_killfeed_line = $2
        WHERE guild_id = $1
    `, [guildId, lastLogLine]);
}

// Balance operations
async function getBalance(guildId, userId) {
    const result = await safeQuery('SELECT balance FROM balances WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0]?.balance || 0;
}

async function setBalance(guildId, userId, amount) {
    await safeQuery(`
        INSERT INTO balances (guild_id, user_id, balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET balance = $3
    `, [guildId, userId, amount]);
    return amount;
}

async function addBalance(guildId, userId, amount) {
    const result = await safeQuery(`
        INSERT INTO balances (guild_id, user_id, balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET balance = balances.balance + $3
        RETURNING balance
    `, [guildId, userId, amount]);
    return result.rows[0].balance;
}

async function getLeaderboard(guildId) {
    const result = await safeQuery(`
        SELECT user_id, balance 
        FROM balances 
        WHERE guild_id = $1 AND balance > 0 
        ORDER BY balance DESC 
        LIMIT 10
    `, [guildId]);
    return result.rows.map(row => [row.user_id, row.balance]);
}

// Bank operations
async function getBank(guildId, userId) {
    const result = await safeQuery('SELECT bank_balance FROM banks WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0]?.bank_balance || 0;
}

async function setBank(guildId, userId, amount) {
    await safeQuery(`
        INSERT INTO banks (guild_id, user_id, bank_balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET bank_balance = $3
    `, [guildId, userId, amount]);
    return amount;
}

async function addBank(guildId, userId, amount) {
    const result = await safeQuery(`
        INSERT INTO banks (guild_id, user_id, bank_balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET bank_balance = banks.bank_balance + $3
        RETURNING bank_balance
    `, [guildId, userId, amount]);
    return result.rows[0].bank_balance;
}

// Cooldown operations
async function getCooldowns(guildId, userId, game) {
    const result = await safeQuery(
        'SELECT timestamp FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND game = $3',
        [guildId, userId, game]
    );
    return result.rows.map(row => parseInt(row.timestamp));
}

async function addCooldown(guildId, userId, game, timestamp) {
    await safeQuery(
        `INSERT INTO cooldowns (guild_id, user_id, game, timestamp) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, user_id, game) 
         DO UPDATE SET timestamp = $4`,
        [guildId, userId, game, timestamp]
    );
}

async function cleanOldCooldowns(guildId, userId, game, windowMs) {
    const cutoff = Date.now() - windowMs;
    await safeQuery(
        'DELETE FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND game = $3 AND timestamp < $4',
        [guildId, userId, game, cutoff]
    );
}

// DayZ name operations
async function getDayZName(guildId, userId) {
    const result = await safeQuery('SELECT dayz_name FROM dayz_names WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0]?.dayz_name || null;
}

async function getUserIdByDayZName(guildId, dayzName) {
    const result = await safeQuery('SELECT user_id FROM dayz_names WHERE guild_id = $1 AND LOWER(dayz_name) = LOWER($2)', [guildId, dayzName]);
    return result.rows[0]?.user_id || null;
}

async function setDayZName(guildId, userId, dayzName) {
    await safeQuery(`
        INSERT INTO dayz_names (guild_id, user_id, dayz_name) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET dayz_name = $3
    `, [guildId, userId, dayzName]);
}

// Player location operations
async function getPlayerLocation(guildId, playerName) {
    const result = await safeQuery(
        'SELECT x, y, z, timestamp FROM player_locations WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2)',
        [guildId, playerName]
    );
    if (!result.rows[0]) return null;
    const { x, y, z } = result.rows[0];
    return { x, y, z };
}

async function setPlayerLocation(guildId, playerName, x, y, z) {
    await safeQuery(`
        INSERT INTO player_locations (guild_id, player_name, x, y, z, timestamp) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        ON CONFLICT (guild_id, player_name) DO UPDATE 
        SET x = $3, y = $4, z = $5, timestamp = $6
    `, [guildId, playerName.toLowerCase(), x, y, z, Date.now()]);
}

async function updateKillfeedState(guildId, lastLogLine) {
    await safeQuery(`
        UPDATE guild_configs 
        SET last_killfeed_line = $2
        WHERE guild_id = $1
    `, [guildId, lastLogLine]);
}

// Player session operations for distance tracking
async function startPlayerSession(guildId, playerName, x, y, z) {
    await safeQuery(`
        INSERT INTO player_sessions (guild_id, player_name, connected_at, start_x, start_y, start_z, last_x, last_y, last_z, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $4, $5, $6, true)
        ON CONFLICT (guild_id, player_name) 
        DO UPDATE SET 
            connected_at = $3,
            start_x = $4, start_y = $5, start_z = $6,
            last_x = $4, last_y = $5, last_z = $6,
            total_distance = 0,
            is_active = true
    `, [guildId, playerName.toLowerCase(), Date.now(), x || 0, y || 0, z || 0]);
}

async function updatePlayerDistance(guildId, playerName, x, y, z) {
    // Calculate distance from last position
    const result = await safeQuery(`
        SELECT last_x, last_y, last_z, total_distance 
        FROM player_sessions 
        WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2) AND is_active = true
    `, [guildId, playerName]);
    
    if (result.rows.length === 0) return null; // Return null to indicate no session exists
    
    const { last_x, last_y, last_z, total_distance } = result.rows[0];
    
    // Calculate 3D distance
    const dx = x - last_x;
    const dy = y - last_y;
    const dz = z - last_z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Ignore teleports (distance > 1000m) as likely respawns
    if (distance > 1000) return total_distance;
    
    const newTotal = total_distance + distance;
    
    // Update position and distance
    await safeQuery(`
        UPDATE player_sessions 
        SET last_x = $3, last_y = $4, last_z = $5, total_distance = $6
        WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2) AND is_active = true
    `, [guildId, playerName, x, y, z, newTotal]);
    
    return newTotal;
}

async function endPlayerSession(guildId, playerName) {
    const result = await safeQuery(`
        UPDATE player_sessions 
        SET is_active = false
        WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2) AND is_active = true
        RETURNING total_distance
    `, [guildId, playerName]);
    
    return result.rows[0]?.total_distance || 0;
}

// ============ DAILY LOGIN REWARDS ============
async function getDailyLogin(guildId, userId) {
    const result = await safeQuery(
        'SELECT * FROM daily_logins WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );
    return result.rows[0] || null;
}

async function updateDailyLogin(guildId, userId, streak, lastConnectionDate = null) {
    const today = new Date().toISOString().split('T')[0];
    await safeQuery(`
        INSERT INTO daily_logins (guild_id, user_id, current_streak, longest_streak, last_claim_date, last_connection_date, total_claims)
        VALUES ($1, $2, $3, $3, $4, $5, 1)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
            current_streak = $3,
            longest_streak = GREATEST(daily_logins.longest_streak, $3),
            last_claim_date = $4,
            last_connection_date = COALESCE($5, daily_logins.last_connection_date),
            total_claims = daily_logins.total_claims + 1
    `, [guildId, userId, streak, today, lastConnectionDate]);
}

async function recordConnection(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    await safeQuery(`
        INSERT INTO daily_logins (guild_id, user_id, last_connection_date, current_streak, last_claim_date, total_claims)
        VALUES ($1, $2, $3, 0, $3, 0)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
            last_connection_date = $3
    `, [guildId, userId, today]);
}

// ============ ACHIEVEMENTS ============
async function getUserAchievements(guildId, userId) {
    const result = await safeQuery(
        'SELECT achievement_id, unlocked_at FROM user_achievements WHERE guild_id = $1 AND user_id = $2 ORDER BY unlocked_at DESC',
        [guildId, userId]
    );
    return result.rows;
}

async function unlockAchievement(guildId, userId, achievementId) {
    try {
        await safeQuery(`
            INSERT INTO user_achievements (guild_id, user_id, achievement_id)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
        `, [guildId, userId, achievementId]);
        return true;
    } catch (error) {
        return false;
    }
}

async function hasAchievement(guildId, userId, achievementId) {
    const result = await safeQuery(
        'SELECT 1 FROM user_achievements WHERE guild_id = $1 AND user_id = $2 AND achievement_id = $3',
        [guildId, userId, achievementId]
    );
    return result.rows.length > 0;
}

// ============ PROPERTIES ============
async function getUserProperties(guildId, userId) {
    const result = await safeQuery(
        'SELECT * FROM user_properties WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );
    return result.rows;
}

async function purchaseProperty(guildId, userId, propertyType, propertyName, purchasePrice, dailyIncome) {
    await safeQuery(`
        INSERT INTO user_properties (guild_id, user_id, property_type, property_name, purchase_price, daily_income)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [guildId, userId, propertyType, propertyName, purchasePrice, dailyIncome]);
}

async function collectPropertyIncome(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await safeQuery(`
        UPDATE user_properties
        SET last_collection_date = $3
        WHERE guild_id = $1 AND user_id = $2 
        AND (last_collection_date IS NULL OR last_collection_date < $3)
        RETURNING daily_income
    `, [guildId, userId, today]);
    
    const totalIncome = result.rows.reduce((sum, row) => sum + row.daily_income, 0);
    return totalIncome;
}

// ============ INVENTORY ============
async function getInventory(guildId, userId) {
    const result = await safeQuery(
        'SELECT item_id, quantity FROM user_inventory WHERE guild_id = $1 AND user_id = $2 AND quantity > 0',
        [guildId, userId]
    );
    return result.rows;
}

async function addInventoryItem(guildId, userId, itemId, quantity) {
    await safeQuery(`
        INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (guild_id, user_id, item_id) DO UPDATE SET
            quantity = user_inventory.quantity + $4,
            updated_at = CURRENT_TIMESTAMP
    `, [guildId, userId, itemId, quantity]);
}

async function removeInventoryItem(guildId, userId, itemId, quantity) {
    await safeQuery(`
        UPDATE user_inventory
        SET quantity = GREATEST(0, quantity - $4),
            updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = $1 AND user_id = $2 AND item_id = $3
    `, [guildId, userId, itemId, quantity]);
}

// ============ WEEKLY EARNINGS ============
async function addWeeklyEarnings(guildId, userId, amount) {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().split('T')[0];
    
    await safeQuery(`
        INSERT INTO weekly_earnings (guild_id, user_id, week_start, total_earned)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (guild_id, user_id, week_start) DO UPDATE SET
            total_earned = weekly_earnings.total_earned + $4
    `, [guildId, userId, weekStart, amount]);
}

async function getWeeklyLeaderboard(guildId, limit = 10) {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().split('T')[0];
    
    const result = await safeQuery(`
        SELECT user_id, total_earned
        FROM weekly_earnings
        WHERE guild_id = $1 AND week_start = $2
        ORDER BY total_earned DESC
        LIMIT $3
    `, [guildId, weekStart, limit]);
    
    return result.rows;
}

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    getGuildConfig,
    setGuildConfig,
    setGuildChannels,
    getAllGuildConfigs,
    updateKillfeedState,
    getBalance,
    setBalance,
    addBalance,
    getLeaderboard,
    getBank,
    setBank,
    addBank,
    getCooldowns,
    addCooldown,
    cleanOldCooldowns,
    getDayZName,
    getUserIdByDayZName,
    setDayZName,
    getPlayerLocation,
    setPlayerLocation,
    startPlayerSession,
    updatePlayerDistance,
    endPlayerSession,
    // Daily rewards
    getDailyLogin,
    updateDailyLogin,
    recordConnection,
    // Achievements
    getUserAchievements,
    unlockAchievement,
    hasAchievement,
    // Properties
    getUserProperties,
    purchaseProperty,
    collectPropertyIncome,
    // Inventory
    getInventory,
    addInventoryItem,
    removeInventoryItem,
    // Weekly leaderboards
    addWeeklyEarnings,
    getWeeklyLeaderboard,
    // Campaigns
    getCampaignProgress: async (guildId, userId, campaignId) => {
        const result = await safeQuery(
            'SELECT * FROM campaign_progress WHERE guild_id = $1 AND user_id = $2 AND campaign_id = $3',
            [guildId, userId, campaignId]
        );
        return result.rows[0];
    },
    startCampaign: async (guildId, userId, campaignId, chapter) => {
        await safeQuery(
            `INSERT INTO campaign_progress (guild_id, user_id, campaign_id, current_chapter, completed, last_played)
             VALUES ($1, $2, $3, $4, false, NOW())
             ON CONFLICT (guild_id, user_id, campaign_id) 
             DO UPDATE SET current_chapter = $4, last_played = NOW()`,
            [guildId, userId, campaignId, chapter]
        );
    },
    updateCampaignProgress: async (guildId, userId, campaignId, chapter, completed = false) => {
        await safeQuery(
            'UPDATE campaign_progress SET current_chapter = $4, completed = $5, last_played = NOW() WHERE guild_id = $1 AND user_id = $2 AND campaign_id = $3',
            [guildId, userId, campaignId, chapter, completed]
        );
    },

    // Kit System
    createKitPurchase: async (guildId, userId, kitName, weaponVariant, attachments, totalCost) => {
        const result = await safeQuery(
            `INSERT INTO kit_purchases (guild_id, user_id, kit_name, weapon_variant, attachments, total_cost)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [guildId, userId, kitName, weaponVariant, JSON.stringify(attachments), totalCost]
        );
        return result.rows[0].id;
    },
    getUnspawnedKits: async (guildId, userId) => {
        const result = await safeQuery(
            'SELECT * FROM kit_purchases WHERE guild_id = $1 AND user_id = $2 AND spawned = false ORDER BY purchased_at DESC',
            [guildId, userId]
        );
        return result.rows;
    },
    markKitSpawned: async (kitId) => {
        await safeQuery(
            'UPDATE kit_purchases SET spawned = true, spawned_at = NOW() WHERE id = $1',
            [kitId]
        );
    },
    getKitHistory: async (guildId, userId, limit = 10) => {
        const result = await safeQuery(
            'SELECT * FROM kit_purchases WHERE guild_id = $1 AND user_id = $2 ORDER BY purchased_at DESC LIMIT $3',
            [guildId, userId, limit]
        );
        return result.rows;
    },

    // Purchase History for debugging spawn issues
    logPurchase: async (guildId, userId, dayzPlayerName, itemName, itemClass, quantity, totalCost, restartId) => {
        const result = await safeQuery(
            `INSERT INTO purchase_history 
             (guild_id, user_id, dayz_player_name, item_name, item_class, quantity, total_cost, purchase_timestamp, restart_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [guildId, userId, dayzPlayerName, itemName, itemClass, quantity, totalCost, Date.now(), restartId]
        );
        return result.rows[0].id;
    },
    
    updatePurchaseSpawnAttempt: async (purchaseId, attempted, success, error, coordinates) => {
        await safeQuery(
            `UPDATE purchase_history 
             SET spawn_attempted = $2, spawn_success = $3, spawn_error = $4, spawn_coordinates = $5
             WHERE id = $1`,
            [purchaseId, attempted, success, error, coordinates]
        );
    },
    
    getPurchaseHistory: async (guildId, userId = null, limit = 50) => {
        if (userId) {
            const result = await safeQuery(
                'SELECT * FROM purchase_history WHERE guild_id = $1 AND user_id = $2 ORDER BY purchase_timestamp DESC LIMIT $3',
                [guildId, userId, limit]
            );
            return result.rows;
        } else {
            const result = await safeQuery(
                'SELECT * FROM purchase_history WHERE guild_id = $1 ORDER BY purchase_timestamp DESC LIMIT $2',
                [guildId, limit]
            );
            return result.rows;
        }
    },
    
    getFailedSpawns: async (guildId, limit = 20) => {
        const result = await safeQuery(
            `SELECT * FROM purchase_history 
             WHERE guild_id = $1 AND (spawn_success = false OR spawn_error IS NOT NULL)
             ORDER BY purchase_timestamp DESC LIMIT $2`,
            [guildId, limit]
        );
        return result.rows;
    },

    // Get player's current position from tracking
    getPlayerPosition: async (guildId, playerName) => {
        const result = await safeQuery(
            `SELECT last_x, last_y, last_z 
             FROM player_sessions 
             WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2) AND is_active = true`,
            [guildId, playerName]
        );
        if (result.rows.length > 0) {
            return {
                x: result.rows[0].last_x,
                y: result.rows[0].last_y,
                z: result.rows[0].last_z
            };
        }
        return null;
    },
    
    // Bounty functions
    createBounty,
    getActiveBountiesForTarget,
    getAllActiveBounties,
    claimBounties,
    cancelBounty,
    getUserActiveBounties,
    expireOldBounties,
    
    // Subscription functions
    getSubscription,
    createSubscription,
    updateSubscriptionStatus,
    cancelSubscription,
    isPremium,
    getSubscriptionPlan,
    getAllSubscriptionPlans,
    
    // Throne system functions
    getReigningKing,
    setReigningKing,
    incrementDefenseCount,
    updateLastChallenged,
    recordThroneChallenge,
    getThroneHistory,
    getUserThroneStats
};

// Bounty operations
async function createBounty(guildId, placerUserId, targetUserId, targetDayzName, amount, anonymous = false, expiresInDays = 7) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const result = await safeQuery(`
        INSERT INTO bounties (guild_id, placer_user_id, target_user_id, target_dayz_name, amount, anonymous, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [guildId, placerUserId, targetUserId, targetDayzName, amount, anonymous, expiresAt]);
    
    return result.rows[0];
}

async function getActiveBountiesForTarget(guildId, targetDayzName) {
    const result = await safeQuery(`
        SELECT * FROM bounties 
        WHERE guild_id = $1 
        AND LOWER(target_dayz_name) = LOWER($2) 
        AND status = 'active'
        ORDER BY created_at ASC
    `, [guildId, targetDayzName]);
    
    return result.rows;
}

async function getAllActiveBounties(guildId) {
    const result = await safeQuery(`
        SELECT 
            target_dayz_name,
            SUM(amount) as total_bounty,
            COUNT(*) as bounty_count,
            MIN(created_at) as oldest_bounty
        FROM bounties 
        WHERE guild_id = $1 AND status = 'active'
        GROUP BY target_dayz_name
        ORDER BY total_bounty DESC
        LIMIT 20
    `, [guildId]);
    
    return result.rows;
}

async function claimBounties(guildId, targetDayzName, killerUserId, killerDayzName) {
    // Get all active bounties for this target
    const bounties = await getActiveBountiesForTarget(guildId, targetDayzName);
    if (bounties.length === 0) return null;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        let totalPaid = 0;
        const claims = [];
        
        for (const bounty of bounties) {
            // Mark bounty as claimed
            await client.query(`
                UPDATE bounties 
                SET status = 'claimed' 
                WHERE id = $1
            `, [bounty.id]);
            
            // Record the claim
            await client.query(`
                INSERT INTO bounty_claims (bounty_id, killer_user_id, killer_dayz_name, amount_paid)
                VALUES ($1, $2, $3, $4)
            `, [bounty.id, killerUserId, killerDayzName, bounty.amount]);
            
            // Add bounty amount to killer's balance
            if (killerUserId) {
                await client.query(`
                    INSERT INTO balances (guild_id, user_id, balance) 
                    VALUES ($1, $2, $3) 
                    ON CONFLICT (user_id, guild_id) DO UPDATE SET balance = balances.balance + $3
                `, [guildId, killerUserId, bounty.amount]);
            }
            
            totalPaid += bounty.amount;
            claims.push({
                bountyId: bounty.id,
                amount: bounty.amount,
                placerId: bounty.placer_user_id,
                anonymous: bounty.anonymous
            });
        }
        
        await client.query('COMMIT');
        
        return {
            totalPaid,
            count: claims.length,
            claims
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function cancelBounty(bountyId, userId) {
    const result = await safeQuery(`
        UPDATE bounties 
        SET status = 'cancelled' 
        WHERE id = $1 AND placer_user_id = $2 AND status = 'active'
        RETURNING *
    `, [bountyId, userId]);
    
    return result.rows[0] || null;
}

async function getUserActiveBounties(guildId, userId) {
    const result = await safeQuery(`
        SELECT * FROM bounties 
        WHERE guild_id = $1 AND placer_user_id = $2 AND status = 'active'
        ORDER BY created_at DESC
    `, [guildId, userId]);
    
    return result.rows;
}

async function expireOldBounties() {
    const result = await safeQuery(`
        UPDATE bounties 
        SET status = 'expired' 
        WHERE status = 'active' AND expires_at < NOW()
        RETURNING id
    `);
    
    return result.rowCount;
}

// ============ SUBSCRIPTION SYSTEM ============

async function getSubscription(guildId) {
    const result = await safeQuery(
        'SELECT * FROM subscriptions WHERE guild_id = $1',
        [guildId]
    );
    return result.rows[0] || null;
}

async function createSubscription(guildId, data) {
    const { stripeCustomerId, stripeSubscriptionId, planTier, status, currentPeriodStart, currentPeriodEnd, trialEnd } = data;
    const result = await safeQuery(`
        INSERT INTO subscriptions 
        (guild_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, current_period_start, current_period_end, trial_end, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (guild_id) 
        DO UPDATE SET 
            stripe_customer_id = $2,
            stripe_subscription_id = $3,
            plan_tier = $4,
            status = $5,
            current_period_start = $6,
            current_period_end = $7,
            trial_end = $8,
            updated_at = NOW()
        RETURNING *
    `, [guildId, stripeCustomerId, stripeSubscriptionId, planTier, status, currentPeriodStart, currentPeriodEnd, trialEnd]);
    return result.rows[0];
}

async function updateSubscriptionStatus(guildId, status, currentPeriodEnd = null) {
    const result = await safeQuery(`
        UPDATE subscriptions 
        SET status = $2, 
            current_period_end = COALESCE($3, current_period_end),
            updated_at = NOW()
        WHERE guild_id = $1
        RETURNING *
    `, [guildId, status, currentPeriodEnd]);
    return result.rows[0];
}

async function cancelSubscription(guildId) {
    const result = await safeQuery(`
        UPDATE subscriptions 
        SET status = 'canceled',
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE guild_id = $1
        RETURNING *
    `, [guildId]);
    return result.rows[0];
}

async function isPremium(guildId) {
    const subscription = await getSubscription(guildId);
    if (!subscription) return false;
    
    // Check if subscription is active and premium
    if (subscription.plan_tier === 'premium' && subscription.status === 'active') {
        // Check if subscription hasn't expired
        if (subscription.current_period_end) {
            return new Date(subscription.current_period_end) > new Date();
        }
        return true;
    }
    
    return false;
}

async function getSubscriptionPlan(planId) {
    const result = await safeQuery(
        'SELECT * FROM subscription_plans WHERE plan_id = $1',
        [planId]
    );
    return result.rows[0] || null;
}

async function getAllSubscriptionPlans() {
    const result = await safeQuery(
        'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_monthly'
    );
    return result.rows;
}

// ============ THRONE SYSTEM ============

async function getReigningKing(guildId) {
    const result = await safeQuery(
        'SELECT * FROM reigning_king WHERE guild_id = $1',
        [guildId]
    );
    return result.rows[0] || null;
}

async function setReigningKing(guildId, userId) {
    const now = Date.now();
    await safeQuery(`
        INSERT INTO reigning_king (guild_id, user_id, crowned_at, defense_count, last_challenged)
        VALUES ($1, $2, $3, 0, 0)
        ON CONFLICT (guild_id) 
        DO UPDATE SET 
            user_id = $2,
            crowned_at = $3,
            defense_count = 0,
            last_challenged = 0
    `, [guildId, userId, now]);
}

async function incrementDefenseCount(guildId) {
    await safeQuery(
        'UPDATE reigning_king SET defense_count = defense_count + 1 WHERE guild_id = $1',
        [guildId]
    );
}

async function updateLastChallenged(guildId, timestamp) {
    await safeQuery(
        'UPDATE reigning_king SET last_challenged = $2 WHERE guild_id = $1',
        [guildId, timestamp]
    );
}

async function recordThroneChallenge(guildId, challengerId, kingId, outcome, wager, winnerId) {
    const result = await safeQuery(`
        INSERT INTO throne_challenges 
        (guild_id, challenger_id, king_id, challenged_at, outcome, wager, winner_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [guildId, challengerId, kingId, Date.now(), outcome, wager, winnerId]);
    return result.rows[0];
}

async function getThroneHistory(guildId, limit = 10) {
    const result = await safeQuery(`
        SELECT * FROM throne_challenges 
        WHERE guild_id = $1 
        ORDER BY challenged_at DESC 
        LIMIT $2
    `, [guildId, limit]);
    return result.rows;
}

async function getUserThroneStats(guildId, userId) {
    const challenges = await safeQuery(`
        SELECT 
            COUNT(*) as total_challenges,
            SUM(CASE WHEN winner_id = $2 THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN winner_id != $2 THEN 1 ELSE 0 END) as losses
        FROM throne_challenges 
        WHERE guild_id = $1 AND (challenger_id = $2 OR king_id = $2)
    `, [guildId, userId]);
    
    return challenges.rows[0] || { total_challenges: 0, wins: 0, losses: 0 };
}

