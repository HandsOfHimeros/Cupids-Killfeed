const db = require('./database.js');

async function checkRestartTimes() {
    try {
        const guilds = await db.getAllGuildConfigs();
        
        console.log('\n=== SERVER RESTART TIMES ===\n');
        
        for (const guild of guilds) {
            const restartHours = guild.restart_hours || '3,9,15,21';
            const hours = restartHours.split(',').map(h => {
                const hour = parseInt(h.trim());
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const display = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                return `${display}:00 ${ampm}`;
            });
            
            console.log(`Guild: ${guild.guild_id}`);
            console.log(`Restart Hours (UTC): ${restartHours}`);
            console.log(`Restart Times: ${hours.join(' • ')}`);
            console.log('');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRestartTimes();
