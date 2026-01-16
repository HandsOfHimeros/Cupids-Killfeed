const items = require('./shop_items.js');

console.log('=== CRITICAL BOUNDARY CHECKS ===\n');

console.log('TOOLS/CLOTHING boundary:');
for (let i = 236; i <= 246; i++) {
  console.log(`  ${i}: ${items[i]?.name}`);
}

console.log('\nCLOTHING/BACKPACKS boundary:');
for (let i = 280; i <= 290; i++) {
  console.log(`  ${i}: ${items[i]?.name}`);
}

console.log('\nBACKPACKS/BUILDING boundary:');
for (let i = 312; i <= 320; i++) {
  console.log(`  ${i}: ${items[i]?.name}`);
}

console.log('\nBUILDING/VEHICLE boundary:');
for (let i = 325; i <= 333; i++) {
  console.log(`  ${i}: ${items[i]?.name}`);
}

console.log('\nVEHICLE/ELECTRONICS boundary:');
for (let i = 336; i <= 345; i++) {
  console.log(`  ${i}: ${items[i]?.name}`);
}
