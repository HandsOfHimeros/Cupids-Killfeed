// Database initialization script for Heroku Postgres
const { Client } = require('pg');

async function initDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Create tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS balances (
                user_id VARCHAR(255) PRIMARY KEY,
                balance INTEGER DEFAULT 0
            );
        `);
        console.log('Created balances table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS banks (
                user_id VARCHAR(255) PRIMARY KEY,
                bank_balance INTEGER DEFAULT 0
            );
        `);
        console.log('Created banks table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS cooldowns (
                user_id VARCHAR(255),
                game VARCHAR(50),
                timestamp BIGINT,
                PRIMARY KEY (user_id, game, timestamp)
            );
        `);
        console.log('Created cooldowns table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS dayz_names (
                user_id VARCHAR(255) PRIMARY KEY,
                dayz_name VARCHAR(255)
            );
        `);
        console.log('Created dayz_names table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS economy (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                balance BIGINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, user_id)
            );
        `);
        console.log('Created economy table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS player_locations (
                player_name VARCHAR(255) PRIMARY KEY,
                x FLOAT,
                y FLOAT,
                z FLOAT,
                timestamp BIGINT
            );
        `);
        console.log('Created player_locations table');

        console.log('✅ Database initialized successfully!');
        
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    initDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = initDatabase;
