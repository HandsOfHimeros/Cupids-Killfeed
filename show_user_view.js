const items = require('./shop_items.js');

const ranges = {
    'ASSAULT_SMG': [0, 23],
    'SNIPER_MARKSMAN': [23, 40],
    'RIFLES_SHOTGUNS': [40, 49],
    'PISTOLS': [49, 63],
    'MELEE': [63, 83],
    'ATTACHMENTS': [83, 159],
    'AMMUNITION': [159, 178],
    'MEDICAL': [178, 195],
    'FOOD_DRINK': [195, 223],
    'TOOLS': [223, 241],
    'CLOTHING_ARMOR': [241, 289],
    'BACKPACKS': [289, 315],
    'BUILDING': [315, 327],
    'VEHICLE': [327, 339],
    'ELECTRONICS': [339, 362]
};

console.log('=== WHAT USER WILL SEE IN EACH CATEGORY ===\n');

Object.entries(ranges).forEach(([cat, [start, end]]) => {
    const categoryItems = items.slice(start, end);
    console.log(`\n${cat} (${categoryItems.length} items):`);
    console.log('First 5:', categoryItems.slice(0, 5).map(i => i.name).join(', '));
    if (categoryItems.length > 10) {
        console.log('...');
        console.log('Last 5:', categoryItems.slice(-5).map(i => i.name).join(', '));
    } else {
        console.log('All:', categoryItems.map(i => i.name).join(', '));
    }
});
