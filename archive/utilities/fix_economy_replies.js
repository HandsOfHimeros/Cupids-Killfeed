// Script to convert interaction.reply to interaction.editReply in economy.js
const fs = require('fs');

const filePath = './commands/economy.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find where economy commands start (after line 1040 where we added deferReply)
// Replace all interaction.reply( with interaction.editReply(
// But keep interaction.followUp( unchanged

// Count replacements
let count = 0;

// Replace await interaction.reply({ with await interaction.editReply({
content = content.replace(/await interaction\.reply\(\{/g, () => {
    count++;
    return 'await interaction.editReply({';
});

// Replace await interaction.reply(' with await interaction.editReply('
content = content.replace(/await interaction\.reply\('/g, () => {
    count++;
    return 'await interaction.editReply(\'';
});

// Replace await interaction.reply(` with await interaction.editReply(`
content = content.replace(/await interaction\.reply\(`/g, () => {
    count++;
    return 'await interaction.editReply(`';
});

// Remove ephemeral: true from editReply calls (editReply doesn't support ephemeral)
content = content.replace(/, ephemeral: true\s*\}/g, ' }');
content = content.replace(/ephemeral: true,/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log(`✅ Replaced ${count} interaction.reply() calls with interaction.editReply()`);
console.log(`✅ Removed ephemeral flags (not supported in editReply)`);
console.log(`✅ File saved: ${filePath}`);
