// Migration: Add log_timestamp column to base_alert_history table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addLogTimestamp() {
    try {
        console.log('Adding log_timestamp column to base_alert_history...');
        
        // Check if column already exists
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='base_alert_history' AND column_name='log_timestamp'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('✅ Column log_timestamp already exists');
            process.exit(0);
        }
        
        // Add the column
        await pool.query(`
            ALTER TABLE base_alert_history 
            ADD COLUMN log_timestamp VARCHAR(8)
        `);
        
        console.log('✅ Successfully added log_timestamp column');
        console.log('This column will store the HH:MM:SS timestamp from log entries to prevent duplicate alerts');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addLogTimestamp();
