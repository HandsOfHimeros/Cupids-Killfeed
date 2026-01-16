require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        
        // Support both single and array command formats
        if (Array.isArray(command.data)) {
            // economy.js exports { data: [...], execute, ... }
            for (const cmd of command.data) {
                if (cmd && cmd.toJSON) {
                    commands.push(cmd.toJSON());
                }
            }
        } else if (command.data && command.data.toJSON) {
            // Standard format: { data: SlashCommandBuilder, execute, ... }
            commands.push(command.data.toJSON());
        }
    } catch (error) {
        console.log(`Skipping ${file}:`, error.message);
    }
}

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Registering ${commands.length} commands to test guild ${process.env.TEST_GUILD_ID}...`);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
            { body: commands }
        );

        console.log('✅ Successfully registered commands to test guild!');
    } catch (error) {
        console.error(error);
    }
})();
