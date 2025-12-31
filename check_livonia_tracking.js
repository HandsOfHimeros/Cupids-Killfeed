const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkTracking() {
    try {
        const result = await pool.query('SELECT guild_id, last_killfeed_line FROM guild_configs WHERE guild_id = $1', ['1445943557020979274']);
        
        console.log('📋 Livonia Tracking State:');
        console.log('Last Killfeed Line:', result.rows[0].last_killfeed_line || '(empty - never polled)');
        console.log('');
        console.log('🔍 The generator placement line:');
        console.log('00:06:34 | Player "HandsOfHimeros" (id=zBWdCF47SsXk4dgczWT2OFHOFwOagYCbc5kDT_BMO2w= pos=<7893.3, 8174.2, 259.4>) placed Power Generator<PowerGenerator>');
        console.log('');
        
        const lastLine = result.rows[0].last_killfeed_line || '';
        if (lastLine.includes('00:06:34') && lastLine.includes('Power Generator')) {
            console.log('✅ Bot has already processed past the generator event!');
            console.log('💡 The generator was placed before we added build event parsing');
            console.log('⚠️ To see the new feature work, place something NEW now');
        } else if (lastLine.includes('00:10:23') && lastLine.includes('disconnected')) {
            console.log('✅ Bot has processed past the disconnect at 00:10:23');
            console.log('💡 This means it already passed the generator event at 00:06:34');
            console.log('⚠️ But build parsing wasn\'t enabled when it was processed');
        } else if (lastLine === '') {
            console.log('⚠️ Bot has never polled Livonia killfeed yet');
            console.log('💡 On first poll, it will skip all old events');
        } else {
            console.log('📝 Bot last saw:', lastLine.substring(0, 100));
        }
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkTracking();
