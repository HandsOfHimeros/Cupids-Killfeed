const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkConfig() {
    const result = await pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', ['1386432422744162476']);
    console.log('Chernarus Guild Config:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    await pool.end();
}

checkConfig();
