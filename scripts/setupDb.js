const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const setup = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            // Connect without db first to create it
            multipleStatements: true
        });

        console.log('Connected to MySQL server');

        // Create DB if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        console.log(`Database ${process.env.DB_NAME} checked/created`);

        // Use DB
        await connection.query(`USE \`${process.env.DB_NAME}\`;`);

        // Read init.sql
        const sqlPath = path.join(__dirname, '../src/config/init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Run queries
        await connection.query(sql);
        console.log('Schema setup completed');

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
};

setup();
