// Script to add new shop items to spawn.json
const fs = require('fs');
const path = require('path');

// New items to add (jackets and NBC gear)
const newItems = [
    // Gorka variants
    'GorkaEJacket_Autumn',
    'GorkaEJacket_Winter',
    
    // USMC variants
    'USMCJacket_Desert',
    'USMCJacket_Woodland',
    
    // M65 variants
    'M65Jacket_Black',
    'M65Jacket_Olive',
    'M65Jacket_Tan',
    
    // Premium Leather Jackets
    'LeatherJacket_Black',
    'LeatherJacket_Brown',
    'LeatherJacket_Natural',
    
    // Bomber Jackets
    'BomberJacket_Black',
    'BomberJacket_Olive',
    'BomberJacket_Brown',
    
    // Riders Jacket
    'RidersJacket_Black',
    
    // Hunting Jackets
    'HuntingJacket_Autumn',
    'HuntingJacket_Brown',
    'HuntingJacket_Spring',
    'HuntingJacket_Winter',
    
    // Hiking Jackets
    'HikingJacket_Black',
    'HikingJacket_Green',
    'HikingJacket_Red',
    
    // Down Jackets
    'DownJacket_Blue',
    'DownJacket_Orange',
    'DownJacket_Green',
    
    // Professional Jackets
    'FirefighterJacket_Black',
    'FirefighterJacket_Beige',
    'ParamedicJacket_Blue',
    'ParamedicJacket_Green',
    'PoliceJacket',
    
    // Casual & Utility
    'QuiltedJacket_Black',
    'QuiltedJacket_Grey',
    'QuiltedJacket_Orange',
    'TrackSuitJacket_Black',
    'TrackSuitJacket_Blue',
    
    // NBC Jackets
    'NBCJacketGray',
    'NBCJacketWhite',
    'NBCJacketYellow',
    
    // NBC Pants
    'NBCPantsGray',
    'NBCPantsWhite',
    
    // NBC Boots
    'NBCBootsGray',
    'NBCBootsWhite',
    'NBCBootsYellow',
    
    // NBC Gloves
    'NBCGlovesGray',
    'NBCGlovesYellow',
    
    // NBC Hoods
    'NBCHoodGray',
    'NBCHoodWhite',
    'NBCHoodYellow'
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
    let skippedCount = 0;
    
    console.log('\nAdding new templates...');
    newItems.forEach(item => {
        if (spawnData.spawnTemplates[item]) {
            console.log(`  ⏭️  ${item} - already exists`);
            skippedCount++;
        } else {
            spawnData.spawnTemplates[item] = generateTemplate(item);
            console.log(`  ✅ ${item} - added`);
            addedCount++;
        }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  Added: ${addedCount} new templates`);
    console.log(`  Skipped: ${skippedCount} existing templates`);
    console.log(`  Total templates: ${Object.keys(spawnData.spawnTemplates).length}`);
    
    // Create backup
    const backupPath = spawnPath + '.backup';
    fs.copyFileSync(spawnPath, backupPath);
    console.log(`\n💾 Backup created: spawn.json.backup`);
    
    // Write updated spawn.json
    fs.writeFileSync(spawnPath, JSON.stringify(spawnData, null, 2), 'utf8');
    console.log(`✅ spawn.json updated successfully!`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
