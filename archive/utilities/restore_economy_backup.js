// Script to restore economy data from backup
const fs = require('fs');
const path = require('path');

const BALANCES_FILE = path.join(__dirname, 'logs/economy_balances.json');
const BANK_FILE = path.join(__dirname, 'logs/economy_banks.json');
const BACKUP_DIR = path.join(__dirname, 'logs/backups');

function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('No backup directory found!');
        return;
    }
    
    const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
    const balanceBackups = files.filter(f => f.startsWith('economy_balances_'));
    const bankBackups = files.filter(f => f.startsWith('economy_banks_'));
    
    console.log('\n=== Available Balance Backups ===');
    balanceBackups.forEach((file, idx) => {
        const timestamp = file.replace('economy_balances_', '').replace('.json', '');
        console.log(`${idx + 1}. ${timestamp}`);
    });
    
    console.log('\n=== Available Bank Backups ===');
    bankBackups.forEach((file, idx) => {
        const timestamp = file.replace('economy_banks_', '').replace('.json', '');
        console.log(`${idx + 1}. ${timestamp}`);
    });
}

function restoreLatestBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('❌ No backup directory found!');
        return;
    }
    
    const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
    const latestBalance = files.find(f => f.startsWith('economy_balances_'));
    const latestBank = files.find(f => f.startsWith('economy_banks_'));
    
    if (!latestBalance && !latestBank) {
        console.log('❌ No backups found!');
        return;
    }
    
    // Create a safety backup of current files before restoring
    const timestamp = Date.now();
    if (fs.existsSync(BALANCES_FILE)) {
        fs.copyFileSync(BALANCES_FILE, BALANCES_FILE + '.before_restore.' + timestamp);
        console.log('📋 Created safety backup of current balances');
    }
    if (fs.existsSync(BANK_FILE)) {
        fs.copyFileSync(BANK_FILE, BANK_FILE + '.before_restore.' + timestamp);
        console.log('📋 Created safety backup of current banks');
    }
    
    // Restore from backup
    if (latestBalance) {
        fs.copyFileSync(
            path.join(BACKUP_DIR, latestBalance),
            BALANCES_FILE
        );
        console.log(`✅ Restored balances from: ${latestBalance}`);
        
        // Show restored data summary
        const data = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
        const userCount = Object.keys(data).length;
        const totalMoney = Object.values(data).reduce((sum, val) => sum + val, 0);
        console.log(`   📊 Restored ${userCount} users with total $${totalMoney}`);
    }
    
    if (latestBank) {
        fs.copyFileSync(
            path.join(BACKUP_DIR, latestBank),
            BANK_FILE
        );
        console.log(`✅ Restored banks from: ${latestBank}`);
        
        // Show restored data summary
        const data = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
        const userCount = Object.keys(data).length;
        const totalMoney = Object.values(data).reduce((sum, val) => sum + val, 0);
        console.log(`   📊 Restored ${userCount} bank accounts with total $${totalMoney}`);
    }
    
    console.log('\n✨ Restore complete! Restart the bot to use the restored data.');
}

function showCurrentData() {
    console.log('\n=== Current Economy Data ===');
    
    if (fs.existsSync(BALANCES_FILE)) {
        const data = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
        const userCount = Object.keys(data).length;
        const totalMoney = Object.values(data).reduce((sum, val) => sum + val, 0);
        console.log(`💰 Balances: ${userCount} users, total $${totalMoney}`);
    } else {
        console.log('❌ No balances file found');
    }
    
    if (fs.existsSync(BANK_FILE)) {
        const data = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
        const userCount = Object.keys(data).length;
        const totalMoney = Object.values(data).reduce((sum, val) => sum + val, 0);
        console.log(`🏦 Banks: ${userCount} accounts, total $${totalMoney}`);
    } else {
        console.log('❌ No banks file found');
    }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

console.log('🔧 Economy Backup & Restore Tool\n');

if (command === 'list') {
    listBackups();
} else if (command === 'restore') {
    showCurrentData();
    console.log('\n⚠️  This will restore from the latest backup...');
    restoreLatestBackup();
} else if (command === 'show') {
    showCurrentData();
} else {
    console.log('Usage:');
    console.log('  node restore_economy_backup.js list     - List all available backups');
    console.log('  node restore_economy_backup.js show     - Show current economy data');
    console.log('  node restore_economy_backup.js restore  - Restore from latest backup');
    console.log('\nExample: node restore_economy_backup.js restore');
}
