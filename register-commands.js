// Script to register all slash commands (including new economy games) with Discord
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Support both config.json (local) and environment variables (Heroku)
const configFile = fs.existsSync('./config.json') ? require('./config.json') : {};
const CLIENTID = process.env.CLIENTID || configFile.CLIENTID;
const TOKEN = process.env.TOKEN || configFile.TOKEN;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (Array.isArray(command.data)) {
        for (const cmd of command.data) {
            commands.push(cmd.toJSON());
        }
    } else if (command.data) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        
        // Register commands globally (works on all servers)
        await rest.put(
            Routes.applicationCommands(CLIENTID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands GLOBALLY.');
    } catch (error) {
        console.error(error);
    }
})();
