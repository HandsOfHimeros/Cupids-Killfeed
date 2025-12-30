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
    const { economyChannel, shopChannel, killfeedChannel, connectionsChannel } = channels;
    await pool.query(`
        UPDATE guild_configs 
        SET economy_channel_id = $2,
            shop_channel_id = $3,
            killfeed_channel_id = $4,
            connections_channel_id = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = $1
    `, [guildId, economyChannel, shopChannel, killfeedChannel, connectionsChannel]);
}

async function getAllGuildConfigs() {
    const result = await pool.query('SELECT * FROM guild_configs');
    return result.rows;
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

module.exports = {
    pool,
    getGuildConfig,
    setGuildConfig,
    setGuildChannels,    getAllGuildConfigs,    getBalance,
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
    setDayZName,
    getPlayerLocation,
    setPlayerLocation
};
