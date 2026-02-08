// Script to extract and organize shop items from types.xml
const fs = require('fs');
const path = require('path');

const typesXmlPath = 'C:\\Users\\MAJIK\\Downloads\\types (1).xml';
const typesContent = fs.readFileSync(typesXmlPath, 'utf-8');

// Extract all type names
const typeMatches = [...typesContent.matchAll(/<type name="([^"]+)"/g)];
const allTypes = typeMatches.map(m => m[1]);

console.log(`Total types found: ${allTypes.length}`);

// Category filters
const categories = {
  assault_smg: /(M4A1|M16|AK101|AK74|AKM|AKS74U|Aug|FAMAS|FAL|ASVAL|SVAL|VSK94|UMP|MP5|PP19|Bizon|Vityaz|PMMP73)/i,
  sniper_marksman: /(Mosin|SVD|VSS|Winchester70|CZ527|CZ550|Scout|SSG82|B95|Blaze95|M70|SV98|Longhorn|VSK)/i,
  rifles_shotguns: /(SKS|Repeater|Ruger|IZH18|IZH43|Saiga|BK133|MP133|M1014|TOZ|Hunting)/i,
  pistols: /(Deagle|FNX45|Glock|CZ75|P1|Makarov|MKII|Engraved|Magnum|Revolver|Derringer|1911|Colt|Longhorn)/i,
  melee: /(Axe|Bat|Machete|Katana|Sword|Crowbar|Pipe|Baton|Hammer|Shovel|Pitchfork|SledgeHammer|Knife|Cleaver|Hatchet)/i,
  attachments: /(Optic|Scope|ACOG|PSO|KashtanOptic|M4_|AK_|Suppressor|Compensator|Bayonet|Buttstock|Handguard|RailAttach|Flashlight|UniversalLight)/i,
  ammunition: /(Ammo|Mag_|Magazine)/i,
  medical: /(Bandage|Saline|BloodBag|Morphine|Epinephrine|Vitamin|Charcoal|Tetracycline|Splint|Disinfectant|Iodine|Painkiller|Antibiotic)/i,
  food: /(Bacon|Spam|Sardines|Tuna|Peach|Tomato|Peas|Beans|Rice|Pasta|Cereal|Apple|Pear|Plum|Potato|Pepper|Pumpkin|Zucchini|Meat|Fish|Fruit|Lunchmeat|Mushroom)/i,
  drinks: /(Water|Soda|Pipsi|NotaCola|Spite|Kvass|Milk|Canteen|Bottle)/i,
  tools: /(Wrench|Pliers|Screwdriver|Hammer|Saw|Pickaxe|Shovel|Crowbar|Lockpick|Duct|Epoxy|Sewing|Leather|Sharpening|WeaponClean)/i,
  clothing: /(Jacket|Hoodie|Coat|Pants|Jeans|Cargo|Boots|Shoes|Gloves|Shirt|TTsKO|Gorka|USMC|Beret|Ushanka|Bandana|Mask|Raincoat|Tracksuit|Sweater|Dress|Skirt)/i,
  armor: /(Vest|PlateCarrier|PressVest|PoliceVest|UKAssVest|SmershVest|Helmet|Ballistic|NBC|GasMask)/i,
  backpacks: /(Bag|Backpack|Sack|TortillaBag|ChildBag|Taloon|AliceBag|AssaultBag|HuntingBag|MountainBag|CoyoteBag|TaloonBag|DrysackBag|DuffelBag)/i,
  storage: /(Tent|Barrel|WoodenCrate|SeaChest|Protector|AmmoBox|MedicalBox)/i,
  building: /(Nail|Plank|Metal|Wire|Barbed|Log|Fence|Watchtower|CodeLock|Combination)/i,
  vehicle: /(Tire|Battery|Sparkplug|Radiator|CarDoor|Hood|Trunk|Headlight)/i,
  electronics: /(Grenade|Landmine|Claymore|Radio|Megaphone|Flashlight|Battery|Chemlight|Flare|Roadflare)/i
};

// Organize items
const organized = {};
for (const [category, regex] of Object.entries(categories)) {
  organized[category] = allTypes.filter(type => regex.test(type));
  console.log(`\n${category.toUpperCase()}: ${organized[category].length} items`);
  organized[category].slice(0, 10).forEach(item => console.log(`  - ${item}`));
  if (organized[category].length > 10) console.log(`  ... and ${organized[category].length - 10} more`);
}

// Save to JSON for review
fs.writeFileSync(
  path.join(__dirname, 'extracted_items.json'),
  JSON.stringify(organized, null, 2)
);

console.log('\n✅ Extraction complete! Check extracted_items.json');
