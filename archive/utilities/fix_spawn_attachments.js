// Remove empty attachments arrays from spawn.json
// Empty attachments arrays can cause spawn failures for non-weapon items

const fs = require('fs');
const path = require('path');

const spawnPath = path.join(__dirname, 'spawn.json');

try {
    console.log('Reading spawn.json...');
    const spawnData = JSON.parse(fs.readFileSync(spawnPath, 'utf8'));
    
    let removedCount = 0;
    let keptCount = 0;
    
    // Process each template
    for (const [className, template] of Object.entries(spawnData.spawnTemplates)) {
        if (template.attachments !== undefined) {
            // If attachments array is empty, remove it
            if (Array.isArray(template.attachments) && template.attachments.length === 0) {
                delete template.attachments;
                removedCount++;
            } else {
                // Keep non-empty attachments arrays (weapons with actual attachments)
                keptCount++;
            }
        }
    }
    
    console.log(`\n✅ Processed ${Object.keys(spawnData.spawnTemplates).length} templates`);
    console.log(`   - Removed ${removedCount} empty attachments arrays`);
    console.log(`   - Kept ${keptCount} non-empty attachments arrays`);
    
    // Create backup
    fs.copyFileSync(spawnPath, spawnPath + '.backup-attachments');
    console.log(`\n💾 Backup created: spawn.json.backup-attachments`);
    
    // Write updated spawn.json
    fs.writeFileSync(spawnPath, JSON.stringify(spawnData, null, 2));
    console.log(`✅ spawn.json updated successfully!`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
