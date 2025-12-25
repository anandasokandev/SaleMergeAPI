const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const updateUsersTable = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to Database');

        try {
            await connection.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL');
            console.log('Added reset_token column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('reset_token column already exists');
            } else {
                console.error('Error adding reset_token:', e);
            }
        }

        try {
            await connection.query('ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP DEFAULT NULL');
            console.log('Added reset_token_expires column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('reset_token_expires column already exists');
            } else {
                console.error('Error adding reset_token_expires:', e);
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

updateUsersTable();
