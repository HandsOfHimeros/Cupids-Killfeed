// Attachment verification tool
// Compares weapon_kits.js against cfgspawnabletypes.xml to find missing items

const fs = require('fs');
const weaponKits = require('./weapon_kits.js');

// Read the XML file
const xmlPath = 'C:\\Users\\MAJIK\\Downloads\\types (1).xml';
const xmlContent = fs.readFileSync(xmlPath, 'utf8');

// Extract all item names from XML
const itemMatches = xmlContent.matchAll(/name="([^"]+)"/g);
const validItems = new Set();
for (const match of itemMatches) {
    validItems.add(match[1]);
}

console.log(`\n📊 Found ${validItems.size} unique items in types.xml\n`);

// Check each weapon kit
for (const [kitName, kit] of Object.entries(weaponKits)) {
    console.log(`\n🔫 ${kitName} (${kit.name})`);
    console.log('─'.repeat(50));
    
    // Check base weapon variants
    console.log('\n  Base Weapon Variants:');
    for (const variant of kit.baseWeapon.variants) {
        if (validItems.has(variant)) {
            console.log(`    ✅ ${variant}`);
        } else {
            console.log(`    ❌ ${variant} - NOT FOUND IN TYPES.XML`);
        }
    }
    
    // Check attachments
    console.log('\n  Attachments:');
    for (const [slotName, slotData] of Object.entries(kit.attachments)) {
        console.log(`\n    ${slotData.name} (${slotName}):`);
        for (const option of slotData.options) {
            if (!option.class) {
                console.log(`      ⚪ ${option.name} (No attachment)`);
            } else if (validItems.has(option.class)) {
                console.log(`      ✅ ${option.name} - ${option.class}`);
            } else {
                console.log(`      ❌ ${option.name} - ${option.class} - NOT FOUND IN TYPES.XML`);
            }
        }
    }
}

console.log('\n\n' + '='.repeat(50));
console.log('📋 SUMMARY');
console.log('='.repeat(50));
console.log('\nItems marked with ❌ do not exist in your server\'s types.xml');
console.log('and will not spawn in-game. You should either:');
console.log('  1. Remove them from weapon_kits.js, OR');
console.log('  2. Add them to your server\'s cfgspawnabletypes.xml\n');
