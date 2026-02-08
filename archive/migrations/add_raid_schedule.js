// Migration script to add raid weekend scheduling columns to guild_configs table

const db = require('./database');

async function addRaidScheduleColumns() {
    try {
        console.log('Adding raid schedule columns to guild_configs table...');
        
        // Add raid_schedule_enabled column
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_schedule_enabled BOOLEAN DEFAULT false
        `);
        console.log('✅ Added raid_schedule_enabled column');
        
        // Add raid_start_day column (0=Sunday, 1=Monday, etc.)
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_start_day INTEGER
        `);
        console.log('✅ Added raid_start_day column');
        
        // Add raid_start_time column (HH:MM format)
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_start_time VARCHAR(5)
        `);
        console.log('✅ Added raid_start_time column');
        
        // Add raid_end_day column
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_end_day INTEGER
        `);
        console.log('✅ Added raid_end_day column');
        
        // Add raid_end_time column
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_end_time VARCHAR(5)
        `);
        console.log('✅ Added raid_end_time column');
        
        // Add raid_timezone column
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_timezone VARCHAR(50) DEFAULT 'America/New_York'
        `);
        console.log('✅ Added raid_timezone column');
        
        // Add raid_currently_active column
        await db.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS raid_currently_active BOOLEAN DEFAULT false
        `);
        console.log('✅ Added raid_currently_active column');
        
        console.log('\n🎉 All raid schedule columns added successfully!');
        console.log('\nNew columns:');
        console.log('  - raid_schedule_enabled (BOOLEAN)');
        console.log('  - raid_start_day (INTEGER)');
        console.log('  - raid_start_time (VARCHAR)');
        console.log('  - raid_end_day (INTEGER)');
        console.log('  - raid_end_time (VARCHAR)');
        console.log('  - raid_timezone (VARCHAR)');
        console.log('  - raid_currently_active (BOOLEAN)');
        
    } catch (error) {
        console.error('❌ Error adding raid schedule columns:', error);
        throw error;
    } finally {
        await db.end();
        process.exit(0);
    }
}

addRaidScheduleColumns();
