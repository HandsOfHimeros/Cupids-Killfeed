const items = require('./shop_items.js');

const ranges = {
    'FOOD_DRINK': [195, 223],
    'TOOLS': [223, 241],
    'CLOTHING_ARMOR': [241, 289],
    'BACKPACKS': [289, 315],
    'BUILDING': [315, 327],
    'VEHICLE': [327, 339],
    'ELECTRONICS': [339, 362]
};

console.log('=== VERIFIED CATEGORY RANGES ===\n');

Object.entries(ranges).forEach(([cat, [start, end]]) => {
    console.log(`${cat} [${start}-${end}]:`);
    console.log(`  First: ${start}: ${items[start]?.name}`);
    console.log(`  Last:  ${end-1}: ${items[end-1]?.name}`);
    console.log(`  Count: ${end-start} items\n`);
});
