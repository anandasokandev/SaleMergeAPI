const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const updateVideosTable = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to Database');

        try {
            await connection.query('ALTER TABLE videos ADD COLUMN drive_link VARCHAR(2048) DEFAULT NULL');
            console.log('Added drive_link column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('drive_link column already exists');
            } else {
                console.error('Error adding drive_link:', e);
            }
        }

        await connection.end();
        console.log('Update completed');
        process.exit(0);
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
};

updateVideosTable();
