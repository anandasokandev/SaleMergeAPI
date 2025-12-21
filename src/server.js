const app = require('./app');
const dotenv = require('dotenv');
const pool = require('./config/database');
const { log, error } = require('./utils/logger');

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Check DB
        await pool.getConnection();
        log('Database connection established');

        app.listen(PORT, () => {
            log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
