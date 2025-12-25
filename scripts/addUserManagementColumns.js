require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function addColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if columns exist
        const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'is_active'`);

        if (columns.length === 0) {
            console.log('Adding is_active column...');
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
                ADD COLUMN credits INT DEFAULT 5
            `);
            console.log('Columns is_active and credits added successfully.');
        } else {
            console.log('Columns already exist.');
        }

    } catch (error) {
        console.error('Error adding columns:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addColumns();
