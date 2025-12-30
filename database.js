// Database helper for PostgreSQL operations
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Balance operations
async function getBalance(userId) {
    const result = await pool.query('SELECT balance FROM balances WHERE user_id = $1', [userId]);
    return result.rows[0]?.balance || 0;
}

async function setBalance(userId, amount) {
    await pool.query(`
        INSERT INTO balances (user_id, balance) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) DO UPDATE SET balance = $2
    `, [userId, amount]);
    return amount;
}

async function addBalance(userId, amount) {
    const result = await pool.query(`
        INSERT INTO balances (user_id, balance) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) DO UPDATE SET balance = balances.balance + $2
        RETURNING balance
    `, [userId, amount]);
    return result.rows[0].balance;
}

async function getLeaderboard() {
    const result = await pool.query(`
        SELECT user_id, balance 
        FROM balances 
        WHERE balance > 0 
        ORDER BY balance DESC 
        LIMIT 10
    `);
    return result.rows.map(row => [row.user_id, row.balance]);
}

// Bank operations
async function getBank(userId) {
    const result = await pool.query('SELECT bank_balance FROM banks WHERE user_id = $1', [userId]);
    return result.rows[0]?.bank_balance || 0;
}

async function setBank(userId, amount) {
    await pool.query(`
        INSERT INTO banks (user_id, bank_balance) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) DO UPDATE SET bank_balance = $2
    `, [userId, amount]);
    return amount;
}

async function addBank(userId, amount) {
    const result = await pool.query(`
        INSERT INTO banks (user_id, bank_balance) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) DO UPDATE SET bank_balance = banks.bank_balance + $2
        RETURNING bank_balance
    `, [userId, amount]);
    return result.rows[0].bank_balance;
}

// Cooldown operations
async function getCooldowns(userId, game) {
    const result = await pool.query(
        'SELECT timestamp FROM cooldowns WHERE user_id = $1 AND game = $2',
        [userId, game]
    );
    return result.rows.map(row => parseInt(row.timestamp));
}

async function addCooldown(userId, game, timestamp) {
    await pool.query(
        'INSERT INTO cooldowns (user_id, game, timestamp) VALUES ($1, $2, $3)',
        [userId, game, timestamp]
    );
}

async function cleanOldCooldowns(userId, game, windowMs) {
    const cutoff = Date.now() - windowMs;
    await pool.query(
        'DELETE FROM cooldowns WHERE user_id = $1 AND game = $2 AND timestamp < $3',
        [userId, game, cutoff]
    );
}

// DayZ name operations
async function getDayZName(userId) {
    const result = await pool.query('SELECT dayz_name FROM dayz_names WHERE user_id = $1', [userId]);
    return result.rows[0]?.dayz_name || null;
}

async function setDayZName(userId, dayzName) {
    await pool.query(`
        INSERT INTO dayz_names (user_id, dayz_name) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) DO UPDATE SET dayz_name = $2
    `, [userId, dayzName]);
}

// Player location operations
async function getPlayerLocation(playerName) {
    const result = await pool.query(
        'SELECT x, y, z, timestamp FROM player_locations WHERE LOWER(player_name) = LOWER($1)',
        [playerName]
    );
    if (!result.rows[0]) return null;
    const { x, y, z } = result.rows[0];
    return { x, y, z };
}

async function setPlayerLocation(playerName, x, y, z) {
    await pool.query(`
        INSERT INTO player_locations (player_name, x, y, z, timestamp) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (player_name) DO UPDATE 
        SET x = $2, y = $3, z = $4, timestamp = $5
    `, [playerName.toLowerCase(), x, y, z, Date.now()]);
}

module.exports = {
    pool,
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
    setDayZName,
    getPlayerLocation,
    setPlayerLocation
};
