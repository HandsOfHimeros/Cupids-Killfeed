// Migrate existing JSON data to database with guild_id
const fs = require('fs');
const path = require('path');
const db = require('./database.js');

const GUILD_ID = '1392564838925914142'; // Your current guild ID

async function migrateData() {
    try {
        console.log('Starting data migration...');
        
        // 1. Migrate current server config
        console.log('\n1. Migrating server configuration...');
        const config = require('./config.json');
        await db.setGuildConfig(GUILD_ID, {
            nitratoServiceId: config.ID1,
            nitratoInstance: config.ID2,
            nitratoToken: config.NITRATOKEN,
            mapName: 'chernarusplus',
            platform: 'PS4',
            restartHours: '8,11,14,17,20,23,2,5',
            timezone: 'UTC'
        });
        
        await db.setGuildChannels(GUILD_ID, {
            economyChannel: '1404621573498863806',
            shopChannel: '1392604466766807051',
            killfeedChannel: null, // Will be set by existing killfeed setup
            connectionsChannel: '1405195781639770224'
        });
        
        console.log('✓ Server configuration migrated');
        
        // 2. Migrate economy balances
        console.log('\n2. Migrating economy balances...');
        const balancesPath = path.join(__dirname, 'logs', 'economy_balances.json');
        if (fs.existsSync(balancesPath)) {
            const balances = JSON.parse(fs.readFileSync(balancesPath, 'utf8'));
            let count = 0;
            for (const [userId, balance] of Object.entries(balances)) {
                await db.setBalance(GUILD_ID, userId, balance);
                count++;
            }
            console.log(`✓ Migrated ${count} balance records`);
        } else {
            console.log('⚠ No balances file found');
        }
        
        // 3. Migrate bank balances
        console.log('\n3. Migrating bank balances...');
        const banksPath = path.join(__dirname, 'logs', 'economy_banks.json');
        if (fs.existsSync(banksPath)) {
            const banks = JSON.parse(fs.readFileSync(banksPath, 'utf8'));
            let count = 0;
            for (const [userId, bankBalance] of Object.entries(banks)) {
                await db.setBank(GUILD_ID, userId, bankBalance);
                count++;
            }
            console.log(`✓ Migrated ${count} bank records`);
        } else {
            console.log('⚠ No banks file found');
        }
        
        // 4. Migrate cooldowns
        console.log('\n4. Migrating cooldowns...');
        const cooldownsPath = path.join(__dirname, 'logs', 'economy_cooldowns.json');
        if (fs.existsSync(cooldownsPath)) {
            const cooldowns = JSON.parse(fs.readFileSync(cooldownsPath, 'utf8'));
            let count = 0;
            for (const [userId, games] of Object.entries(cooldowns)) {
                for (const [game, timestamps] of Object.entries(games)) {
                    for (const timestamp of timestamps) {
                        await db.addCooldown(GUILD_ID, userId, game, timestamp);
                        count++;
                    }
                }
            }
            console.log(`✓ Migrated ${count} cooldown records`);
        } else {
            console.log('⚠ No cooldowns file found');
        }
        
        // 5. Migrate DayZ names
        console.log('\n5. Migrating DayZ names...');
        const namesPath = path.join(__dirname, 'dayz_names.json');
        if (fs.existsSync(namesPath)) {
            const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
            let count = 0;
            for (const [userId, dayzName] of Object.entries(names)) {
                await db.setDayZName(GUILD_ID, userId, dayzName);
                count++;
            }
            console.log(`✓ Migrated ${count} DayZ name records`);
        } else {
            console.log('⚠ No dayz_names file found');
        }
        
        // 6. Migrate player locations
        console.log('\n6. Migrating player locations...');
        const locationsPath = path.join(__dirname, 'player_locations.json');
        if (fs.existsSync(locationsPath)) {
            const locations = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
            let count = 0;
            for (const [playerName, location] of Object.entries(locations)) {
                await db.setPlayerLocation(GUILD_ID, playerName, location.x, location.y, location.z);
                count++;
            }
            console.log(`✓ Migrated ${count} player location records`);
        } else {
            console.log('⚠ No player_locations file found');
        }
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Update economy.js to use guild-aware database calls');
        console.log('2. Update index.js to use guild config');
        console.log('3. Test thoroughly before deploying');
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    } finally {
        await db.pool.end();
    }
}

migrateData().catch(console.error);
