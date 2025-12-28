const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const revert = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('Connected to MySQL server');

        // 1. Drop video_selections table
        try {
            await connection.query(`DROP TABLE IF EXISTS video_selections;`);
            console.log('Dropped video_selections table');
        } catch (err) {
            console.error('Error dropping video_selections:', err);
        }

        // 2. Drop total_premium column from videos table
        try {
            await connection.query(`ALTER TABLE videos DROP COLUMN total_premium;`);
            console.log('Dropped total_premium column from videos table');
        } catch (err) {
            console.log('Could not drop total_premium (might not exist or other error):', err.message);
        }

        await connection.end();
        console.log('Reversion completed');
        process.exit(0);
    } catch (err) {
        console.error('Reversion failed:', err);
        process.exit(1);
    }
};

revert();
