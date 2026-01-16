// Test the new "Struck by" parsing logic

const testLine = 'nowis_luk84 Struck by: Player "szym834" (id=jFYMsGMtcr8StEzGZKdOPq6gE1NKeSWkGqGmFdRRR3s= pos=<4650.5, 6772.5, 273.1>) into Torso(23) for 37.5796 damage (Bullet_45ACP) with USG-45 from 3.03257 meters';

// Current regex pattern
const struckMatch = testLine.match(/["']?([^"'\s]+)["']?\s*Struck by:\s*Player\s*["'](.+?)["']\s*\([^)]*\)\s*into\s*\S+\s*for\s*[\d.]+\s*damage\s*\([^)]*\)\s*with\s*(.+?)\s*from\s*([\d.]+)\s*meters/i);

if (struckMatch) {
    const victim = struckMatch[1];
    const attacker = struckMatch[2];
    const weapon = struckMatch[3];
    const distance = Math.round(parseFloat(struckMatch[4]));
    const source = `${attacker} with ${weapon} (${distance}m)`;
    
    console.log('✅ PARSING SUCCESSFUL!\n');
    console.log('Extracted Data:');
    console.log('  Victim:   ', victim);
    console.log('  Attacker: ', attacker);
    console.log('  Weapon:   ', weapon);
    console.log('  Distance: ', distance + 'm');
    console.log('\nFormatted source:', source);
    console.log('\n📊 How it will appear in Discord:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 WOUNDED IN COMBAT 🎯');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🩸 **${victim}**`);
    console.log(`Struck by: ${source}`);
    console.log('🕐 Time: [timestamp]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} else {
    console.log('❌ PARSING FAILED - would show raw log line instead');
    console.log('\nRaw line would be displayed:');
    console.log(testLine);
}
