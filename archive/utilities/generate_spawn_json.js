const fs = require('fs');
const shopItems = require('./shop_items.js');

// Create spawn templates from shop items
const spawnTemplates = {};

shopItems.forEach(item => {
    // Base template
    const template = {
        name: item.class,
        pos: [0, 0, 0],
        ypr: [0, 0, 0],
        scale: 1,
        enableCEPersistency: 0
    };
    
    // Add quantity for ammo and bandages
    if (item.class.startsWith('Ammo_') || item.class === 'BandageDressing') {
        template.quantity = 1;
    }
    
    // Add attachments array for weapons
    if (!item.class.includes('Mag_') && 
        !item.class.includes('Optic') && 
        !item.class.includes('Suppressor') && 
        !item.class.includes('Bttstck') && 
        !item.class.includes('Hndgrd') && 
        !item.class.includes('Bayonet') && 
        !item.class.includes('Compensator') && 
        !item.class.includes('Light') && 
        !item.class.includes('GhillieAtt') && 
        !item.class.includes('Bag') && 
        !item.class.includes('Helmet') && 
        !item.class.includes('Vest') && 
        !item.class.includes('Gloves') && 
        !item.class.includes('NVG') && 
        !item.class.includes('Canteen') && 
        !item.class.includes('Tetracycline') && 
        !item.class.includes('Epinephrine') && 
        !item.class.includes('Morphine') && 
        !item.class.includes('Saline') && 
        !item.class.includes('Bandage') && 
        !item.class.includes('Lockpick') && 
        !item.class.includes('Car') && 
        !item.class.includes('Spark') && 
        !item.class.includes('Canister') && 
        !item.class.includes('Ammo_') &&
        (item.class.includes('M4') || 
         item.class.includes('AK') || 
         item.class.includes('Mosin') || 
         item.class.includes('SVD') || 
         item.class.includes('VSS') || 
         item.class.includes('FAL') || 
         item.class.includes('Winchester') || 
         item.class.includes('CZ') || 
         item.class.includes('Scout') || 
         item.class.includes('SSG') || 
         item.class.includes('SKS') || 
         item.class.includes('Repeater') || 
         item.class.includes('Ruger') || 
         item.class.includes('Izh') || 
         item.class.includes('Mp133') || 
         item.class.includes('Saiga') || 
         item.class.includes('UMP') || 
         item.class.includes('MP5') || 
         item.class.includes('PP19') || 
         item.class.includes('PM73') || 
         item.class.includes('CZ61') || 
         item.class.includes('Deagle') || 
         item.class.includes('FNX') || 
         item.class.includes('Glock') || 
         item.class.includes('P1') || 
         item.class.includes('Makarov') || 
         item.class.includes('MKII') || 
         item.class.includes('Aug') || 
         item.class.includes('FAMAS') || 
         item.class.includes('M16'))) {
        // Note: DayZ JSON spawn format does not support attachments field
    }
    
    spawnTemplates[item.class] = template;
});

const spawnJson = {
    "_comment": "Spawn templates for DayZ items. Auto-generated from shop_items.js",
    "_instructions": {
        "name": "Exact DayZ class name (e.g., 'M4A1', 'AKM', 'Mosin9130')",
        "pos": "Position [x, y, z] - Cupid bot sets this to player location automatically",
        "ypr": "Rotation [yaw, pitch, roll] - usually [0,0,0]",
        "scale": "Size multiplier - usually 1",
        "enableCEPersistency": "0 = temporary spawn, 1 = persistent",
        "attachments": "Array of attachment class names (for weapons)",
        "quantity": "For stackable items like ammo or bandages"
    },
    "spawnTemplates": spawnTemplates,
    "defaultSpawnTemplate": {
        "pos": [0, 0, 0],
        "ypr": [0, 0, 0],
        "scale": 1,
        "enableCEPersistency": 0
    }
};

// Write to file
fs.writeFileSync('spawn.json', JSON.stringify(spawnJson, null, 2), 'utf8');
console.log(`✅ Generated spawn.json with ${Object.keys(spawnTemplates).length} item templates`);
