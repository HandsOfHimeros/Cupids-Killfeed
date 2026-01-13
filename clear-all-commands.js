// Clear ALL commands (global and guild-specific) from Discord
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { CLIENTID, GUILDID, TOKEN } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Clearing all guild-specific commands...');
        await rest.put(Routes.applicationGuildCommands(CLIENTID, GUILDID), { body: [] });
        console.log('✓ Guild commands cleared');
        
        console.log('Clearing all global commands...');
        await rest.put(Routes.applicationCommands(CLIENTID), { body: [] });
        console.log('✓ Global commands cleared');
        
        console.log('\n✓ All commands cleared! Now run: node register.js');
    } catch (error) {
        console.error('Error:', error);
    }
})();
