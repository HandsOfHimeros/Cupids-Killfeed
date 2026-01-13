/* DayZero KillFeed (DZK) DIY Project 2.1
Copyright (c) 2023 TheCodeGang LLC.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

const fs = require('node:fs');
const path = require('node:path');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v10');
const { Guild } = require('discord.js');
const { CLIENTID, GUILDID, TOKEN } = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    if (command && Array.isArray(command.data)) {
      for (const cmd of command.data) {
        if (cmd && typeof cmd.toJSON === 'function') {
          const json = cmd.toJSON();
          commands.push(json);
          console.log(`Registering command from array: ${json.name}`);
        } else {
          console.warn(`Invalid command format in array in file: ${filePath}`);
        }
      }
    } else if (command && command.data && typeof command.data.toJSON === 'function') {
      const json = command.data.toJSON();
      commands.push(json);
      console.log(`Registering command: ${json.name}`);
    } else {
      console.warn(`No commands detected in file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error loading command file ${filePath}:`, error);
  }
}

const rest = new REST({version: '10'}).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing DayZero (/) commands.');
    
    // Register commands globally (available on all servers)
    await rest.put(Routes.applicationCommands(CLIENTID), {
      body: commands,
    });
    
    console.log('Successfully reloaded DayZero (/) commands globally.');
  } catch (error) {
    console.error(error);
  }
})().catch(function (error) {
  console.log(error);
});
