const db = require('./database');

async function checkAllGuildsForBuild() {
    try {
        const guilds = await db.getAllGuildConfigs();
        
        console.log('\n=== All Guild Configs ===\n');
        
        for (const guild of guilds) {
            console.log(`Guild: ${guild.guild_id}`);
            console.log(`  Server Name: ${guild.server_name || 'NOT SET'}`);
            console.log(`  Map: ${guild.map_name || 'NOT SET'}`);
            console.log(`  Build Channel: ${guild.build_channel_id || 'NOT SET'}`);
            console.log(`  Killfeed Channel: ${guild.killfeed_channel_id || 'NOT SET'}`);
            console.log(`  Nitrado Service: ${guild.nitrado_service_id || 'NOT SET'}`);
            console.log(`  Nitrado Instance: ${guild.nitrado_instance || 'NOT SET'}`);
            console.log(`  Nitrado Token: ${guild.nitrado_token ? 'SET' : 'NOT SET'}`);
            console.log('');
        }
        
        // Check specifically for Sakhal
        const sakhal = guilds.find(g => g.guild_id === '1445957198000820316');
        
        if (!sakhal) {
            console.log('❌ Sakhal (1445957198000820316) NOT FOUND in guild_configs!');
        } else {
            console.log('=== Sakhal Specific Analysis ===');
            console.log('✅ Sakhal found in database');
            console.log(`Build Channel ID: ${sakhal.build_channel_id}`);
            
            const issues = [];
            if (!sakhal.build_channel_id) issues.push('Missing build_channel_id');
            if (!sakhal.nitrado_service_id) issues.push('Missing nitrado_service_id');
            if (!sakhal.nitrado_instance) issues.push('Missing nitrado_instance');
            if (!sakhal.nitrado_token) issues.push('Missing nitrado_token');
            
            if (issues.length > 0) {
                console.log('\n⚠️  Issues found:');
                issues.forEach(issue => console.log(`   - ${issue}`));
            } else {
                console.log('✅ All required fields are set');
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAllGuildsForBuild();
