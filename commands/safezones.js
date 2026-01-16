const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('safezones')
        .setDescription('View configured safe zones on this PVP server'),
    
    async execute(interaction) {
        const guildId = interaction.guildId;
        
        try {
            // Get guild configuration
            const guildConfig = await db.getGuildConfig(guildId);
            
            if (!guildConfig) {
                return interaction.reply({ 
                    content: 'This server is not configured yet.', 
                    ephemeral: true 
                });
            }
            
            const zones = guildConfig.safe_zones || [];
            
            if (zones.length === 0) {
                return interaction.reply({ 
                    content: 'No safe zones are configured for this server.', 
                    ephemeral: true 
                });
            }
            
            const mapName = guildConfig.map_name || 'chernarusplus';
            const autoBanStatus = guildConfig.auto_ban_in_safe_zones ? '🔴 **AUTO-BAN ENABLED**' : '⚪ Informational only';
            
            let response = `# 🛡️ Safe Zones\n${autoBanStatus}\n\n`;
            response += `**${zones.length} Safe Zone${zones.length > 1 ? 's' : ''} Configured:**\n\n`;
            
            zones.forEach((zone, index) => {
                const centerX = Math.round((zone.x1 + zone.x2) / 2);
                const centerZ = Math.round((zone.z1 + zone.z2) / 2);
                const mapUrl = `https://www.izurvive.com/${mapName}/#location=${centerX};${centerZ};5`;
                
                const width = Math.abs(zone.x2 - zone.x1);
                const height = Math.abs(zone.z2 - zone.z1);
                
                const izX1 = Math.floor(zone.x1 / 100);
                const izZ1 = Math.floor(zone.z1 / 100);
                const izX2 = Math.floor(zone.x2 / 100);
                const izZ2 = Math.floor(zone.z2 / 100);
                
                const corner1Url = `https://www.izurvive.com/${mapName}/#location=${zone.x1};${zone.z1};5`;
                const corner2Url = `https://www.izurvive.com/${mapName}/#location=${zone.x2};${zone.z2};5`;
                
                response += `**${index + 1}. ${zone.name}**\n`;
                response += `📍 [View on Map](${mapUrl})\n`;
                response += `iZurvive: (${izX1}, ${izZ1}) to (${izX2}, ${izZ2})\n`;
                response += `Corner 1: [${Math.round(zone.x1)}, ${Math.round(zone.z1)}](${corner1Url})\n`;
                response += `Corner 2: [${Math.round(zone.x2)}, ${Math.round(zone.z2)}](${corner2Url})\n`;
                response += `Size: ${Math.round(width)}m × ${Math.round(height)}m\n\n`;
            });
            
            if (guildConfig.auto_ban_in_safe_zones) {
                response += `\n⚠️ **Warning:** PVP in safe zones will result in automatic ban!`;
            }
            
            await interaction.reply(response);
            
        } catch (error) {
            console.error('Error fetching safe zones:', error);
            await interaction.reply({ 
                content: 'Failed to fetch safe zones.', 
                ephemeral: true 
            });
        }
    },
};
