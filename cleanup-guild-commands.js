// Script to remove old guild-specific commands that are causing duplicates
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { CLIENTID, GUILDID, TOKEN } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Fetching guild-specific commands...');
        
        const guildCommands = await rest.get(
            Routes.applicationGuildCommands(CLIENTID, GUILDID)
        );
        
        console.log(`Found ${guildCommands.length} guild-specific commands.`);
        
        if (guildCommands.length > 0) {
            console.log('Deleting all guild-specific commands...');
            
            await rest.put(
                Routes.applicationGuildCommands(CLIENTID, GUILDID),
                { body: [] }
            );
            
            console.log('Successfully deleted all guild-specific commands!');
            console.log('Only global commands will remain (may take up to 1 hour to sync).');
        } else {
            console.log('No guild-specific commands found. Duplicates may be from cache.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
