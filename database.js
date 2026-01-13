// Database helper for PostgreSQL operations
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Guild Config operations
async function getGuildConfig(guildId) {
    const result = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
    return result.rows[0] || null;
}

async function setGuildConfig(guildId, config) {
    const { nitratoServiceId, nitratoInstance, nitratoToken, mapName, platform, restartHours, timezone } = config;
    await pool.query(`
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
    await pool.query(`
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
    const result = await pool.query('SELECT * FROM guild_configs');
    return result.rows;
}

async function updateKillfeedState(guildId, lastLogLine) {
    await pool.query(`
        UPDATE guild_configs 
        SET last_killfeed_line = $2
        WHERE guild_id = $1
    `, [guildId, lastLogLine]);
}

// Balance operations
async function getBalance(guildId, userId) {
    const result = await pool.query('SELECT balance FROM balances WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0]?.balance || 0;
}

async function setBalance(guildId, userId, amount) {
    await pool.query(`
        INSERT INTO balances (guild_id, user_id, balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET balance = $3
    `, [guildId, userId, amount]);
    return amount;
}

async function addBalance(guildId, userId, amount) {
    const result = await pool.query(`
        INSERT INTO balances (guild_id, user_id, balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET balance = balances.balance + $3
        RETURNING balance
    `, [guildId, userId, amount]);
    return result.rows[0].balance;
}

async function getLeaderboard(guildId) {
    const result = await pool.query(`
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
    const result = await pool.query('SELECT bank_balance FROM banks WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0]?.bank_balance || 0;
}

async function setBank(guildId, userId, amount) {
    await pool.query(`
        INSERT INTO banks (guild_id, user_id, bank_balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET bank_balance = $3
    `, [guildId, userId, amount]);
    return amount;
}

async function addBank(guildId, userId, amount) {
    const result = await pool.query(`
        INSERT INTO banks (guild_id, user_id, bank_balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET bank_balance = banks.bank_balance + $3
        RETURNING bank_balance
    `, [guildId, userId, amount]);
    return result.rows[0].bank_balance;
}

// Cooldown operations
async function getCooldowns(guildId, userId, game) {
    const result = await pool.query(
        'SELECT timestamp FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND game = $3',
        [guildId, userId, game]
    );
    return result.rows.map(row => parseInt(row.timestamp));
}

async function addCooldown(guildId, userId, game, timestamp) {
    await pool.query(
        `INSERT INTO cooldowns (guild_id, user_id, game, timestamp) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, user_id, game) 
         DO UPDATE SET timestamp = $4`,
        [guildId, userId, game, timestamp]
    );
}

async function cleanOldCooldowns(guildId, userId, game, windowMs) {
    const cutoff = Date.now() - windowMs;
    await pool.query(
        'DELETE FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND game = $3 AND timestamp < $4',
        [guildId, userId, game, cutoff]
    );
}

// DayZ name operations
async function getDayZName(guildId, userId) {
    const result = await pool.query('SELECT dayz_name FROM dayz_names WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0]?.dayz_name || null;
}

async function getUserIdByDayZName(guildId, dayzName) {
    const result = await pool.query('SELECT user_id FROM dayz_names WHERE guild_id = $1 AND LOWER(dayz_name) = LOWER($2)', [guildId, dayzName]);
    return result.rows[0]?.user_id || null;
}

async function setDayZName(guildId, userId, dayzName) {
    await pool.query(`
        INSERT INTO dayz_names (guild_id, user_id, dayz_name) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, guild_id) DO UPDATE SET dayz_name = $3
    `, [guildId, userId, dayzName]);
}

// Player location operations
async function getPlayerLocation(guildId, playerName) {
    const result = await pool.query(
        'SELECT x, y, z, timestamp FROM player_locations WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2)',
        [guildId, playerName]
    );
    if (!result.rows[0]) return null;
    const { x, y, z } = result.rows[0];
    return { x, y, z };
}

async function setPlayerLocation(guildId, playerName, x, y, z) {
    await pool.query(`
        INSERT INTO player_locations (guild_id, player_name, x, y, z, timestamp) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        ON CONFLICT (guild_id, player_name) DO UPDATE 
        SET x = $3, y = $4, z = $5, timestamp = $6
    `, [guildId, playerName.toLowerCase(), x, y, z, Date.now()]);
}

async function updateKillfeedState(guildId, lastLogLine) {
    await pool.query(`
        UPDATE guild_configs 
        SET last_killfeed_line = $2
        WHERE guild_id = $1
    `, [guildId, lastLogLine]);
}

// Player session operations for distance tracking
async function startPlayerSession(guildId, playerName, x, y, z) {
    await pool.query(`
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
    const result = await pool.query(`
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
    await pool.query(`
        UPDATE player_sessions 
        SET last_x = $3, last_y = $4, last_z = $5, total_distance = $6
        WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2) AND is_active = true
    `, [guildId, playerName, x, y, z, newTotal]);
    
    return newTotal;
}

async function endPlayerSession(guildId, playerName) {
    const result = await pool.query(`
        UPDATE player_sessions 
        SET is_active = false
        WHERE guild_id = $1 AND LOWER(player_name) = LOWER($2) AND is_active = true
        RETURNING total_distance
    `, [guildId, playerName]);
    
    return result.rows[0]?.total_distance || 0;
}

// Bounty operations
async function getActiveBounties(guildId) {
    const result = await pool.query(`
        SELECT placer_id, target_id, amount 
        FROM bounties 
        WHERE guild_id = $1 AND is_active = true
        ORDER BY amount DESC
    `, [guildId]);
    return result.rows;
}

async function addBounty(guildId, placerId, targetId, amount) {
    await pool.query(`
        INSERT INTO bounties (guild_id, placer_id, target_id, amount, is_active, placed_at)
        VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
    `, [guildId, placerId, targetId, amount]);
}

async function claimBounty(guildId, targetId) {
    const result = await pool.query(`
        UPDATE bounties 
        SET is_active = false 
        WHERE guild_id = $1 AND target_id = $2 AND is_active = true
        RETURNING amount
    `, [guildId, targetId]);
    return result.rows[0]?.amount || 0;
}

// User stats operations
async function getUserStats(guildId, userId) {
    const result = await pool.query(`
        SELECT * FROM user_stats 
        WHERE guild_id = $1 AND user_id = $2
    `, [guildId, userId]);
    
    if (result.rows.length === 0) {
        // Create default stats
        await pool.query(`
            INSERT INTO user_stats (guild_id, user_id, total_earned, total_spent, mini_games_played, mini_games_won, bounties_claimed, distance_traveled)
            VALUES ($1, $2, 0, 0, 0, 0, 0, 0)
        `, [guildId, userId]);
        return {
            total_earned: 0,
            total_spent: 0,
            mini_games_played: 0,
            mini_games_won: 0,
            bounties_claimed: 0,
            distance_traveled: 0
        };
    }
    
    return result.rows[0];
}

async function incrementStat(guildId, userId, statName, amount = 1) {
    await pool.query(`
        INSERT INTO user_stats (guild_id, user_id, ${statName})
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET ${statName} = user_stats.${statName} + $3
    `, [guildId, userId, amount]);
}

// Tournament operations
async function checkTournamentEntry(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(`
        SELECT * FROM tournament_entries 
        WHERE guild_id = $1 AND user_id = $2 AND entry_date = $3
    `, [guildId, userId, today]);
    return result.rows.length > 0;
}

async function enterTournament(guildId, userId, entryCost) {
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`
        INSERT INTO tournament_entries (guild_id, user_id, entry_date, entry_cost)
        VALUES ($1, $2, $3, $4)
    `, [guildId, userId, today, entryCost]);
}

async function getTournamentParticipants(guildId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(`
        SELECT user_id, entry_cost FROM tournament_entries 
        WHERE guild_id = $1 AND entry_date = $2
    `, [guildId, today]);
    return result.rows;
}

module.exports = {
    pool,
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
    getActiveBounties,
    addBounty,
    claimBounty,
    getUserStats,
    incrementStat,
    checkTournamentEntry,
    enterTournament,
    getTournamentParticipants
};
