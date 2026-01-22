const db = require('./database.js');

async function fixBaseAlertHistory() {
    try {
        console.log('Checking base_alert_history table schema...');
        
        // Check if detected_at column exists
        const checkColumn = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'base_alert_history' AND column_name = 'detected_at'
        `);
        
        if (checkColumn.rows.length === 0) {
            console.log('detected_at column missing! Adding it now...');
            
            // Add the detected_at column with default to NOW()
            await db.query(`
                ALTER TABLE base_alert_history 
                ADD COLUMN detected_at TIMESTAMP DEFAULT NOW()
            `);
            
            console.log('✓ Added detected_at column to base_alert_history table');
        } else {
            console.log('✓ detected_at column already exists');
        }
        
        // Show current schema
        const schema = await db.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'base_alert_history' 
            ORDER BY ordinal_position
        `);
        
        console.log('\nCurrent base_alert_history schema:');
        schema.rows.forEach(r => {
            console.log(`  - ${r.column_name}: ${r.data_type}${r.column_default ? ` (default: ${r.column_default})` : ''}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixBaseAlertHistory();
