const db = require('./database.js');

async function checkColumns() {
    try {
        const result = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'guild_configs'");
        console.log('Guild Configs Table Columns:');
        result.rows.forEach(row => console.log('-', row.column_name));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkColumns();
