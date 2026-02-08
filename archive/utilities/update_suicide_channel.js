// Script to update the suicide_channel_id for a specific guild in the database
require('dotenv').config();
const { pool } = require('./database');

async function updateSuicideChannelId(guildId, suicideChannelId) {
  try {
    await pool.query(
      `UPDATE guild_configs SET suicide_channel_id = $2, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $1`,
      [guildId, suicideChannelId]
    );
    console.log(`Updated suicide_channel_id for guild_id ${guildId} to ${suicideChannelId}`);
  } catch (err) {
    console.error('Error updating suicide_channel_id:', err);
  } finally {
    await pool.end();
  }
}

// Chernarus guild and channel IDs
const guildId = '1386432422744162476';
const suicideChannelId = '1414744890813845645';

updateSuicideChannelId(guildId, suicideChannelId);
