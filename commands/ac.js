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

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client, Intents, MessageEmbed } = require('discord.js');
const { GUILDID, ID1, NITRATOKEN } = require('../config.json');
const db = require('../database');
const ini = require('ini');
const axios = require('axios');
const FormData = require('form-data');
const concat = require('concat-stream'); // Install Module "npm i concat-stream"

// Initialize local files if they don't exist
const logFiles = ["./logs/ban.txt", "./logs/priority.txt", "./logs/whitelist.txt"];
logFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "");
  }
});

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ac')
    .setDescription('Contains all Access Control commands')
    .setDefaultMemberPermissions("0") // Admin only
    .addSubcommandGroup(subcommand =>
      subcommand
        .setName('serverlist')
        .setDescription('Edit Nitrado Server Access Lists')
        .addSubcommand(subcommand =>
          subcommand
            .setName('whitelist')
            .setDescription('Add or Remove GamerTag to Whitelist')
            .addStringOption(option =>
              option.setName('gamertag')
                .setDescription('Enter a GamerTag')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('action')
                .setDescription('Select desired whitelisting action: Add or Remove')
                .setRequired(true)
                .addChoices(
                  { name: 'ADD', value: 'add' },
                  { name: 'REMOVE', value: 'remove' },
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('banlist')
            .setDescription('Add or Remove GamerTag to Banlist')
            .addStringOption(option =>
              option.setName('gamertag')
                .setDescription('Enter a GamerTag')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('action')
                .setDescription('Select desired action')
                .setRequired(true)
                .addChoices(
                  { name: 'ADD', value: 'add' },
                  { name: 'REMOVE', value: 'remove' },
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('priority')
            .setDescription('Add or Remove GamerTag to Priority List')
            .addStringOption(option =>
              option.setName('gamertag')
                .setDescription('Enter a GamerTag')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('action')
                .setDescription('Select desired action')
                .setRequired(true)
                .addChoices(
                  { name: 'ADD', value: 'add' },
                  { name: 'REMOVE', value: 'remove' },
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('getlist')
            .setDescription('Download Current Specified Nitrado Server Access List')
            .addStringOption(option =>
              option.setName('action')
                .setDescription('Select desired list')
                .setRequired(true)
                .addChoices(
                  { name: 'Whitelist', value: 'wl' },
                  { name: 'Banlist', value: 'ban' },
                  { name: 'Priority', value: 'pl' },
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('resetlist')
            .setDescription('Reset Specified Nitrado Server Access List')
            .addStringOption(option =>
              option.setName('action')
                .setDescription('Select which list will be reset')
                .setRequired(true)
                .addChoices(
                  { name: 'Whitelist', value: 'wl' },
                  { name: 'Banlist', value: 'ban' },
                  { name: 'Priority', value: 'pl' },
                )
            )
        )
    ),

  async execute(interaction) {
    const subCommand = interaction.options.getSubcommand();

    switch (subCommand) {
      case 'whitelist':
        await handleWhitelistCommand(interaction);
        break;
      case 'banlist':
        await handleBanlistCommand(interaction);
        break;
      case 'priority':
        await handlePriorityCommand(interaction);
        break;
      case 'getlist':
        await handleGetlistCommand(interaction);
        break;
      case 'resetlist':
        await handleResetlistCommand(interaction);
        break;
      default:
        break;
    }
  }
};

async function handleWhitelistCommand(interaction) {
  const guildId = interaction.guildId;
  
  // Check if guild has a configuration in database
  const guildConfig = await db.getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
  }
  
  const target = interaction.options.getString('gamertag');
  const choice = interaction.options.getString('action');

  if (choice === 'add') {
    await addToNitradoList(guildConfig, target, 'whitelist', 'Whitelist', interaction);
  } else if (choice === 'remove') {
    await removeFromNitradoList(guildConfig, target, 'whitelist', 'Whitelist', interaction);
  }
}

async function handleBanlistCommand(interaction) {
  const guildId = interaction.guildId;
  
  // Check if guild has a configuration in database
  const guildConfig = await db.getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
  }
  
  const target = interaction.options.getString('gamertag');
  const choice = interaction.options.getString('action');

  if (choice === 'add') {
    await addToNitradoList(guildConfig, target, 'bans', 'Banlist', interaction);
  } else if (choice === 'remove') {
    await removeFromNitradoList(guildConfig, target, 'bans', 'Banlist', interaction);
  }
}

async function handlePriorityCommand(interaction) {
  const guildId = interaction.guildId;
  
  // Check if guild has a configuration in database
  const guildConfig = await db.getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
  }
  
  const target = interaction.options.getString('gamertag');
  const choice = interaction.options.getString('action');

  if (choice === 'add') {
    await addToNitradoList(guildConfig, target, 'priority', 'Priority List', interaction);
  } else if (choice === 'remove') {
    await removeFromNitradoList(guildConfig, target, 'priority', 'Priority List', interaction);
  }
}

async function handleGetlistCommand(interaction) {
  const guildId = interaction.guildId;
  
  // Check if guild has a configuration in database
  const guildConfig = await db.getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
  }
  
  const choice = interaction.options.getString('action');
  let listKey = '';
  let listName = '';

  switch (choice) {
    case 'wl':
      listKey = 'whitelist';
      listName = 'Whitelist';
      break;
    case 'ban':
      listKey = 'bans';
      listName = 'Banlist';
      break;
    case 'pl':
      listKey = 'priority';
      listName = 'Priority List';
      break;
    default:
      break;
  }

  if (listKey) {
    await getListFromNitrado(guildConfig, listKey, listName, interaction);
  }
}

async function handleResetlistCommand(interaction) {
  const guildId = interaction.guildId;
  
  // Check if guild has a configuration in database
  const guildConfig = await db.getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply({ content: 'This server is not configured. Please run `/admin killfeed setup` first.', ephemeral: true });
  }
  
  const choice = interaction.options.getString('action');
  let listKey = '';
  let listName = '';

  switch (choice) {
    case 'wl':
      listKey = 'whitelist';
      listName = 'Whitelist';
      break;
    case 'ban':
      listKey = 'bans';
      listName = 'Banlist';
      break;
    case 'pl':
      listKey = 'priority';
      listName = 'Priority List';
      break;
    default:
      break;
  }

  if (listKey) {
    await resetListOnNitrado(guildConfig, listKey, listName, interaction);
  }
}

// Fetch list from Nitrado server
async function getListFromNitrado(guildConfig, listKey, listName, interaction) {
  try {
    await interaction.reply(`Fetching ${listName} from Nitrado...`);
    
    const url = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    const settings = response.data.data.settings;
    const listData = settings.general?.[listKey] || '';
    
    if (listData && listData.trim().length > 0) {
      // Split into chunks if too long for Discord
      const chunks = listData.match(/[\s\S]{1,1900}/g) || [];
      for (const chunk of chunks) {
        await interaction.channel.send(`\`\`\`\n${chunk}\n\`\`\``);
      }
      await interaction.channel.send(`**Done!**`);
    } else {
      await interaction.channel.send(`${listName} is empty.`);
    }
  } catch (error) {
    console.error(`Error fetching ${listName}:`, error.message);
    await interaction.channel.send(`Error fetching ${listName}: ${error.message}`);
  }
}

// Add player to Nitrado list
async function addToNitradoList(guildConfig, target, listKey, listName, interaction) {
  try {
    // First, get current list
    const getUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
    const getResponse = await axios.get(getUrl, {
      headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    const settings = getResponse.data.data.settings;
    let currentList = settings.general?.[listKey] || '';
    
    // Check if already in list
    if (currentList.includes(target)) {
      return interaction.reply(`${target} is already in the ${listName}!`).catch(console.error);
    }
    
    // Add to list
    const newList = currentList ? `${currentList}\n${target}` : target;
    
    // Update on Nitrado
    const formData = new FormData();
    formData.append("category", "general");
    formData.append("key", listKey);
    formData.append("value", newList);
    
    const headers = {
      ...formData.getHeaders(),
      "Authorization": `Bearer ${guildConfig.nitrado_token}`,
    };
    
    const postUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
    
    formData.pipe(concat(async (data) => {
      try {
        const response = await axios.post(postUrl, data, { headers });
        if (response.status >= 200 && response.status < 300) {
          interaction.reply(`✅ Added **${target}** to ${listName}!`).catch(console.error);
        }
      } catch (error) {
        console.error(error);
        interaction.reply(`❌ Error adding to ${listName}: ${error.message}`).catch(console.error);
      }
    }));
  } catch (error) {
    console.error(error);
    interaction.reply(`❌ Error: ${error.message}`).catch(console.error);
  }
}

// Remove player from Nitrado list
async function removeFromNitradoList(guildConfig, target, listKey, listName, interaction) {
  try {
    // First, get current list
    const getUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
    const getResponse = await axios.get(getUrl, {
      headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    const settings = getResponse.data.data.settings;
    let currentList = settings.general?.[listKey] || '';
    
    // Check if in list
    if (!currentList.includes(target)) {
      return interaction.reply(`${target} is not in the ${listName}!`).catch(console.error);
    }
    
    // Remove from list
    const lines = currentList.split('\n').filter(line => line.trim() !== target.trim());
    const newList = lines.join('\n');
    
    // Update on Nitrado
    const formData = new FormData();
    formData.append("category", "general");
    formData.append("key", listKey);
    formData.append("value", newList);
    
    const headers = {
      ...formData.getHeaders(),
      "Authorization": `Bearer ${guildConfig.nitrado_token}`,
    };
    
    const postUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
    
    formData.pipe(concat(async (data) => {
      try {
        const response = await axios.post(postUrl, data, { headers });
        if (response.status >= 200 && response.status < 300) {
          interaction.reply(`✅ Removed **${target}** from ${listName}!`).catch(console.error);
        }
      } catch (error) {
        console.error(error);
        interaction.reply(`❌ Error removing from ${listName}: ${error.message}`).catch(console.error);
      }
    }));
  } catch (error) {
    console.error(error);
    interaction.reply(`❌ Error: ${error.message}`).catch(console.error);
  }
}

// Reset list on Nitrado
async function resetListOnNitrado(guildConfig, listKey, listName, interaction) {
  try {
    const formData = new FormData();
    formData.append("category", "general");
    formData.append("key", listKey);
    formData.append("value", "");
    
    const headers = {
      ...formData.getHeaders(),
      "Authorization": `Bearer ${guildConfig.nitrado_token}`,
    };
    
    const url = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/settings`;
    
    formData.pipe(concat(async (data) => {
      try {
        const response = await axios.post(url, data, { headers });
        if (response.status >= 200 && response.status < 300) {
          interaction.reply(`✅ ${listName} has been reset!`).catch(console.error);
        }
      } catch (error) {
        console.error(error);
        interaction.reply(`❌ Reset failed: ${error.message}`).catch(console.error);
      }
    }));
  } catch (error) {
    console.error(error);
    interaction.reply(`❌ Error: ${error.message}`).catch(console.error);
  }
}
