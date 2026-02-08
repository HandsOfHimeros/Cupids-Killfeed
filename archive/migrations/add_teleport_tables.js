require('dotenv').config();
const db = require('./database.js');

async function addTeleportTables() {
    try {
        console.log('Creating teleport_zones table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS teleport_zones (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                server VARCHAR(50) NOT NULL,
                zone_name VARCHAR(100) NOT NULL,
                x FLOAT NOT NULL,
                y FLOAT NOT NULL,
                z FLOAT NOT NULL,
                box_size_x FLOAT DEFAULT 27,
                box_size_y FLOAT DEFAULT 5.2,
                box_size_z FLOAT DEFAULT 11,
                created_by VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, server, zone_name)
            )
        `);
        console.log('✅ teleport_zones table created');

        console.log('Creating teleport_routes table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS teleport_routes (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                server VARCHAR(50) NOT NULL,
                from_zone_name VARCHAR(100) NOT NULL,
                to_zone_name VARCHAR(100) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                created_by VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, server, from_zone_name, to_zone_name)
            )
        `);
        console.log('✅ teleport_routes table created');

        console.log('\n✅ All teleport tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

addTeleportTables();
