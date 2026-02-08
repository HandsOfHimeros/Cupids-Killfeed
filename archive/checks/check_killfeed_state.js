// Check killfeed_state table
require('dotenv').config();
const db = require('./database.js');

(async () => {
    try {
        console.log('Checking killfeed_state table...\n');
        
        // Check if table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'killfeed_state'
            );
        `);
        console.log('Table exists:', tableCheck.rows[0].exists);
        
        if (tableCheck.rows[0].exists) {
            // Get all rows
            const result = await db.query(`
                SELECT guild_id, 
                       LEFT(last_killfeed_line, 150) as last_line_preview,
                       LENGTH(last_killfeed_line) as line_length,
                       updated_at
                FROM killfeed_state 
                ORDER BY updated_at DESC
            `);
            
            console.log(`\nFound ${result.rows.length} rows:\n`);
            result.rows.forEach(row => {
                console.log(`Guild ID: ${row.guild_id}`);
                console.log(`Last line length: ${row.line_length} chars`);
                console.log(`Preview: ${row.last_line_preview}`);
                console.log(`Updated: ${row.updated_at}`);
                console.log('---\n');
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
})();
