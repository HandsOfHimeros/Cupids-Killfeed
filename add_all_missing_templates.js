// Add all missing spawn templates from shop_items.js
const fs = require('fs');
const path = require('path');

const shopItems = require('./shop_items.js');
const spawnPath = path.join(__dirname, 'spawn.json');
const spawnData = JSON.parse(fs.readFileSync(spawnPath, 'utf8'));

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

console.log('Scanning shop_items.js for missing templates...\n');

const missing = [];
const existing = [];

shopItems.forEach((item, idx) => {
    if (!spawnData.spawnTemplates[item.class]) {
        missing.push({ idx, name: item.name, class: item.class });
    } else {
        existing.push(item.class);
    }
});

console.log(`Found ${missing.length} missing templates out of ${shopItems.length} shop items\n`);

if (missing.length > 0) {
    console.log('Missing templates:');
    missing.forEach(item => {
        console.log(`  ❌ [${item.idx}] ${item.name} (${item.class})`);
    });
    
    // Create backup
    const backupPath = spawnPath + '.backup3';
    fs.copyFileSync(spawnPath, backupPath);
    console.log(`\n💾 Backup created: spawn.json.backup3`);
    
    // Add missing templates
    missing.forEach(item => {
        spawnData.spawnTemplates[item.class] = generateTemplate(item.class);
    });
    
    // Write updated spawn.json
    fs.writeFileSync(spawnPath, JSON.stringify(spawnData, null, 2), 'utf8');
    
    console.log(`\n✅ Added ${missing.length} missing templates`);
    console.log(`📊 Total templates: ${Object.keys(spawnData.spawnTemplates).length}`);
} else {
    console.log('✅ All shop items have spawn templates!');
}
