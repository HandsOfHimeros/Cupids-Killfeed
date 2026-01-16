// Add missing storage items to spawn.json
const fs = require('fs');
const path = require('path');

const storageItems = [
    'MediumTent',
    'LargeTent',
    'CarTent',
    'Barrel_Blue',
    'Barrel_Green',
    'Barrel_Red',
    'Barrel_Yellow',
    'SeaChest',
    'WoodenCrate',
    'ProtectorCase'
];

function generateTemplate(className) {
    return {
        name: className,
        pos: [0, 0, 0],
        ypr: [0, 0, 0],
        scale: 1,
        enableCEPersistency: 0,
        attachments: []
    };
}

try {
    console.log('Reading spawn.json...');
    const spawnPath = path.join(__dirname, 'spawn.json');
    const spawnData = JSON.parse(fs.readFileSync(spawnPath, 'utf8'));
    
    let addedCount = 0;
    
    console.log('\nAdding storage item templates...');
    storageItems.forEach(item => {
        if (spawnData.spawnTemplates[item]) {
            console.log(`  ⏭️  ${item} - already exists`);
        } else {
            spawnData.spawnTemplates[item] = generateTemplate(item);
            console.log(`  ✅ ${item} - added`);
            addedCount++;
        }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  Added: ${addedCount} storage templates`);
    console.log(`  Total templates: ${Object.keys(spawnData.spawnTemplates).length}`);
    
    // Create backup
    const backupPath = spawnPath + '.backup2';
    fs.copyFileSync(spawnPath, backupPath);
    console.log(`\n💾 Backup created: spawn.json.backup2`);
    
    // Write updated spawn.json
    fs.writeFileSync(spawnPath, JSON.stringify(spawnData, null, 2), 'utf8');
    console.log(`✅ spawn.json updated successfully!`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
