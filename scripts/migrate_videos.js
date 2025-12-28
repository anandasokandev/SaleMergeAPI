const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('Connected to MySQL server');

        // 1. Add total_premium column to videos table if it doesn't exist
        try {
            await connection.query(`ALTER TABLE videos ADD COLUMN total_premium DECIMAL(10, 2) DEFAULT 0.00;`);
            console.log('Added total_premium column to videos table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('total_premium column already exists');
            } else {
                throw err;
            }
        }

        // 2. Create video_selections table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS video_selections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                video_id INT NOT NULL,
                video_option_id INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
            );
        `);
        console.log('Created video_selections table');

        await connection.end();
        console.log('Migration completed');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
