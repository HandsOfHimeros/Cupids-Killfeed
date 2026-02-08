const items = require('./shop_items.js');

console.log('Total items:', items.length);
console.log('\n=== FULL CATEGORY VERIFICATION ===\n');

const ranges = {
    'ASSAULT_SMG': [0, 23],
    'SNIPER_MARKSMAN': [23, 40],
    'RIFLES_SHOTGUNS': [40, 49],
    'PISTOLS': [49, 63],
    'MELEE': [63, 83],
    'ATTACHMENTS': [83, 159],
    'AMMUNITION': [159, 178],
    'MEDICAL': [178, 195],
    'FOOD_DRINK': [195, 226],
    'TOOLS': [226, 243],
    'CLOTHING_ARMOR': [243, 285],
    'BACKPACKS': [285, 317],
    'BUILDING': [317, 329],
    'VEHICLE': [329, 341],
    'ELECTRONICS': [341, 364]
};

for (const [category, [start, end]] of Object.entries(ranges)) {
    console.log(`\n${category} [${start}-${end}]:`);
    console.log(`  Count: ${end - start} items`);
    
    // Show first 2 items
    if (end - start >= 2) {
        console.log(`  First: ${start}: ${items[start]?.name}`);
        console.log(`         ${start+1}: ${items[start+1]?.name}`);
    }
    
    // Show last 2 items
    if (end - start >= 2) {
        console.log(`  Last:  ${end-2}: ${items[end-2]?.name}`);
        console.log(`         ${end-1}: ${items[end-1]?.name}`);
    }
    
    // Show what comes after
    if (items[end]) {
        console.log(`  Next:  ${end}: ${items[end]?.name} (should be in next category)`);
    }
}

console.log('\n=== CHECKING FOR OBVIOUS MISPLACEMENTS ===\n');

// Check for guns in wrong categories
const categories = [
    { name: 'ASSAULT_SMG', range: [0, 23], expected: ['M4', 'AK', 'AUG', 'FAMAS', 'FAL', 'VAL', 'MP5', 'UMP', 'PP-19', 'Bizon'] },
    { name: 'SNIPER_MARKSMAN', range: [23, 40], expected: ['Mosin', 'SVD', 'VSS', 'Winchester', 'CR-527', 'CZ550', 'Scout', 'SSG82', 'B95', 'Blaze', 'M70', 'SV-98', 'Longhorn'] },
    { name: 'RIFLES_SHOTGUNS', range: [40, 49], expected: ['SKS', 'Repeater', 'Ruger', 'IZH', 'Izh', 'BK', 'MP-133', 'Saiga', 'M1014'] },
    { name: 'PISTOLS', range: [49, 63], expected: ['Desert Eagle', 'Deagle', 'FNX', 'Glock', 'CZ-75', 'P1', 'Makarov', 'MKII', 'Colt', '1911', 'Revolver', 'Derringer'] },
    { name: 'MELEE', range: [63, 83], expected: ['Bat', 'Crowbar', 'Pipe', 'Wrench', 'Axe', 'Machete', 'Sledge', 'Shovel', 'Pickaxe', 'Sword', 'Knife', 'Baton', 'Hammer'] },
    { name: 'ATTACHMENTS', range: [83, 159], expected: ['ACOG', 'Scope', 'Optic', 'Suppressor', 'Mag', 'Magazine', 'Buttstock', 'Handguard', 'STANAG', 'CMAG'] },
    { name: 'AMMUNITION', range: [159, 178], expected: ['Ammo', 'Box', 'Rounds'] },
    { name: 'MEDICAL', range: [178, 195], expected: ['Bandage', 'Saline', 'Blood', 'IV', 'Morphine', 'Epinephrine', 'Tetracycline', 'Vitamins', 'Splint', 'Defibrillator'] },
    { name: 'FOOD_DRINK', range: [195, 226], expected: ['Beans', 'Peaches', 'Tactical Bacon', 'Rice', 'Pasta', 'Water', 'Soda', 'Canteen', 'Bottle', 'Apple', 'Pear'] },
];

categories.forEach(cat => {
    const categoryItems = items.slice(cat.range[0], cat.range[1]);
    const misplaced = categoryItems.filter((item, idx) => {
        const itemName = item.name.toLowerCase();
        const matches = cat.expected.some(keyword => itemName.includes(keyword.toLowerCase()));
        return !matches;
    });
    
    if (misplaced.length > 0) {
        console.log(`\n⚠️  ${cat.name} has ${misplaced.length} potentially misplaced items:`);
        misplaced.forEach(item => {
            const idx = items.indexOf(item);
            console.log(`   ${idx}: ${item.name}`);
        });
    }
});
