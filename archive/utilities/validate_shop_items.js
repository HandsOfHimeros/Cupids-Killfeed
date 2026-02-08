// Validation Script: Check all shop items against types.xml
// Run: node validate_shop_items.js

const fs = require('fs');
const path = require('path');

const SHOP_ITEMS_FILE = './shop_items.js';
const TYPES_XML_FILE = 'C:\\Users\\MAJIK\\Downloads\\types (3).xml';

// Read shop items
const shopItems = require(SHOP_ITEMS_FILE);

// Read types.xml and extract all class names
const typesXmlContent = fs.readFileSync(TYPES_XML_FILE, 'utf8');

// Extract all class names from types.xml (format: <type name="ClassName">)
const typeNameRegex = /<type name="([^"]+)">/g;
const validClassNames = new Set();
let match;
while ((match = typeNameRegex.exec(typesXmlContent)) !== null) {
  validClassNames.add(match[1]);
}

console.log(`📋 Total shop items: ${shopItems.length}`);
console.log(`📋 Total valid DayZ class names: ${validClassNames.size}\n`);

// Validate each shop item
const invalidItems = [];
const validItems = [];

shopItems.forEach((item, index) => {
  if (!validClassNames.has(item.class)) {
    invalidItems.push({
      index: index + 1,
      name: item.name,
      class: item.class,
      price: item.averagePrice
    });
  } else {
    validItems.push(item.class);
  }
});

// Display results
console.log('✅ VALIDATION RESULTS\n');
console.log(`✅ Valid items: ${validItems.length}/${shopItems.length}`);
console.log(`❌ Invalid items: ${invalidItems.length}/${shopItems.length}\n`);

if (invalidItems.length > 0) {
  console.log('❌ INVALID ITEMS FOUND:\n');
  console.log('These items have class names that DO NOT exist in types.xml:\n');
  
  invalidItems.forEach(item => {
    console.log(`[Line ${item.index}] ${item.name}`);
    console.log(`   Class: "${item.class}" ❌ NOT FOUND`);
    console.log(`   Price: ${item.price} coins`);
    console.log('');
  });
  
  console.log(`\n🔧 RECOMMENDATION:`);
  console.log(`Remove or replace these ${invalidItems.length} items from shop_items.js`);
  console.log(`Players cannot spawn these items because the class names don't exist in DayZ.\n`);
} else {
  console.log('🎉 All shop items are valid! No issues found.\n');
}

// Optional: Save report to file
const reportPath = './shop_validation_report.txt';
const reportLines = [
  '====================================',
  'SHOP ITEMS VALIDATION REPORT',
  `Generated: ${new Date().toLocaleString()}`,
  '====================================',
  '',
  `Total shop items: ${shopItems.length}`,
  `Valid items: ${validItems.length}`,
  `Invalid items: ${invalidItems.length}`,
  '',
  '====================================',
  'INVALID ITEMS (Class names not in types.xml):',
  '====================================',
  ''
];

if (invalidItems.length > 0) {
  invalidItems.forEach(item => {
    reportLines.push(`[Line ${item.index}] ${item.name}`);
    reportLines.push(`   Class: "${item.class}" ❌ NOT FOUND`);
    reportLines.push(`   Price: ${item.price} coins`);
    reportLines.push('');
  });
} else {
  reportLines.push('✅ No invalid items found!');
}

fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
console.log(`📝 Full report saved to: ${reportPath}\n`);
