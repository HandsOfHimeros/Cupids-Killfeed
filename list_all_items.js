const items = require('./shop_items.js');

console.log('Total items:', items.length);
console.log('\n=== ALL ITEMS BY INDEX ===\n');

items.forEach((item, idx) => {
    console.log(`${idx}: ${item.name}`);
});
