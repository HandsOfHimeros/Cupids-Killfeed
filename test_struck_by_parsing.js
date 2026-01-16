// Test parsing for both player and environmental "Struck by" formats

const testLines = [
    // Player-vs-player hit
    'nowis_luk84 Struck by: Player "szym834" (id=jFYMsGMtcr8StEzGZKdOPq6gE1NKeSWkGqGmFdRRR3s= pos=<4650.5, 6772.5, 273.1>) into Torso(23) for 37.5796 damage (Bullet_45ACP) with USG-45 from 3.03257 meters',
    
    // Environmental hit (Fireplace)
    'Ares559warrioR Struck by: Fireplace with FireDamage',
    
    // Other environmental possibilities
    'PlayerName Struck by: Infected with MeleeDamage',
    'PlayerName Struck by: FallDamage'
];

console.log('Testing "Struck by" parsing:\n');

testLines.forEach((line, index) => {
    console.log(`Test ${index + 1}:`);
    console.log(`Log: ${line}\n`);
    
    let victim, source;
    
    // Parsing logic (matching updated multi_guild_killfeed.js)
    if (line.includes('Struck by:')) {
        // Extract victim name (before "Struck by:")
        let victimMatch = line.match(/["']?([^"'\s]+)["']?\s*Struck by:/i);
        if (victimMatch) {
            victim = victimMatch[1];
            
            // Check if it's a player hit
            let playerHitMatch = line.match(/Struck by:\s*Player\s*["'](.+?)["']\s*\([^)]*\)\s*into\s*\S+\s*for\s*[\d.]+\s*damage\s*\([^)]*\)\s*with\s*(.+?)\s*from\s*([\d.]+)\s*meters/i);
            if (playerHitMatch) {
                source = `${playerHitMatch[1]} with ${playerHitMatch[2]} (${Math.round(parseFloat(playerHitMatch[3]))}m)`;
            } else {
                // Environmental hit
                let envMatch = line.match(/Struck by:\s*(.+?)(?:\s+with\s+(.+?))?$/i);
                if (envMatch) {
                    let envSource = envMatch[1].trim();
                    let damageType = envMatch[2] ? envMatch[2].trim() : null;
                    source = damageType ? `${envSource} with ${damageType}` : envSource;
                }
            }
        }
    }
    
    console.log(`✓ Victim: ${victim}`);
    console.log(`✓ Source: ${source}`);
    console.log('\nDiscord Embed Preview:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 WOUNDED IN COMBAT 🎯');
    console.log(`🩸 **${victim}**`);
    console.log(`Struck by: ${source}`);
    console.log('🕐 Time: [timestamp]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
