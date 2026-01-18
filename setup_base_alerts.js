// Setup Base Alerts System
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupBaseAlerts() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('Connected to database');
        
        // Read and execute SQL file
        const sqlPath = path.join(__dirname, 'init_base_alerts.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log('✅ Base alerts tables created successfully!');
        
    } catch (error) {
        console.error('❌ Error setting up base alerts:', error);
        throw error;
    } finally {
        await client.end();
    }
}

// Run if called directly
if (require.main === module) {
    require('dotenv').config();
    setupBaseAlerts()
        .then(() => {
            console.log('Setup complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupBaseAlerts;
