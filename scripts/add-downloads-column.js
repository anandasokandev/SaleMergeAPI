const pool = require('../src/config/database');

async function migrate() {
    try {
        console.log('Running migration...');

        // Add downloads_count
        try {
            await pool.query('ALTER TABLE users ADD COLUMN downloads_count INT DEFAULT 0');
            console.log('Added downloads_count column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('downloads_count already exists.');
            } else {
                throw err;
            }
        }

        // Add credits if missing (just in case)
        try {
            await pool.query('ALTER TABLE users ADD COLUMN credits INT DEFAULT 0');
            console.log('Added credits column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('credits already exists.');
            } else {
                console.error('Error adding credits:', err.message);
            }
        }

        // Add is_active if missing
        try {
            await pool.query('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE');
            console.log('Added is_active column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('is_active already exists.');
            } else {
                console.error('Error adding is_active:', err.message);
            }
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
