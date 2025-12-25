const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('Connected to DB');

        const [rows] = await conn.query('SHOW COLUMNS FROM videos');
        console.log('Columns in videos table:', rows.map(r => r.Field));

        const [videos] = await conn.query('SELECT id, status, drive_link FROM videos ORDER BY id DESC LIMIT 5');
        console.log('Recent Videos:', videos);

        await conn.end();
    } catch (err) {
        console.error('Schema check failed:', err);
    }
})();
