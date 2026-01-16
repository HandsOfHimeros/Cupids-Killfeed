const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pvpzones')
        .setDescription('View PVP safe zones on this server'),
    
    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const guildConfig = await db.getGuildConfig(guildId);
            
            if (!guildConfig) {
                return interaction.reply({
                    content: '❌ This server is not configured. An admin needs to run `/admin killfeed setup` first.',
                    ephemeral: true
                });
            }
            
            const zones = guildConfig.pvp_zones || [];
            
            if (zones.length === 0) {
                return interaction.reply({
                    content: '📍 No PVP zones configured on this server.\n\nIf this is a PVE server with PVP areas, ask an admin to add zones using `/admin killfeed pvpzone add`',
                    ephemeral: true
                });
            }
            
            const mapName = guildConfig.map_name || 'chernarusplus';
            const mapUrlBase = mapName === 'sakhal' ? 'https://www.izurvive.com/sakhal/' : 
                              mapName === 'livonia' ? 'https://www.izurvive.com/livonia/' :
                              'https://www.izurvive.com/';
            
            let response = `**🎯 PVP Safe Zones (${zones.length})**\n`;
            response += guildConfig.auto_ban_on_kill 
                ? '⚠️ PVE Mode Active - Players are auto-banned for kills outside these zones\n\n'
                : 'ℹ️ Auto-ban is currently disabled on this server\n\n';
            
            zones.forEach((zone, index) => {
                const { name, x1, z1, x2, z2 } = zone;
                const centerX = (x1 + x2) / 2;
                const centerZ = (z1 + z2) / 2;
                const mapLink = `${mapUrlBase}#location=${centerX.toFixed(0)};${centerZ.toFixed(0)};7`;
                
                const izuX1 = Math.floor(x1 / 100);
                const izuZ1 = Math.floor(z1 / 100);
                const izuX2 = Math.floor(x2 / 100);
                const izuZ2 = Math.floor(z2 / 100);
                
                response += `**${index + 1}. ${name}**\n`;
                response += `   📍 [View on Map](${mapLink})\n`;
                response += `   iZurvive: (${izuX1}, ${izuZ1}) to (${izuX2}, ${izuZ2})\n`;
                
                const width = Math.abs(x2 - x1);
                const height = Math.abs(z2 - z1);
                response += `   Size: ${Math.round(width)}m × ${Math.round(height)}m\n\n`;
            });
            
            response += '*Kills inside these zones will NOT trigger auto-ban (if enabled)*';
            
            return interaction.reply({ content: response, ephemeral: false });
            
        } catch (error) {
            console.error('Error fetching PVP zones:', error);
            return interaction.reply({
                content: '❌ Error retrieving PVP zones. Please try again.',
                ephemeral: true
            });
        }
    }
};
