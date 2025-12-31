const { pool } = require('./database');

async function setAllGuildsActive() {
    const guilds = [
        '1386432422744162476', // Chernarus
        '1445943557020979274', // Livonia
        '1445957198000820316'  // Sakhal
    ];

    console.log('Setting all guilds to active...\n');

    for (const guildId of guilds) {
        await pool.query(
            'UPDATE guild_configs SET is_active = TRUE WHERE guild_id = $1',
            [guildId]
        );
        console.log(`✅ Set guild ${guildId} to active`);
    }

    console.log('\n✅ All guilds are now active!');
    process.exit(0);
}

setAllGuildsActive().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
