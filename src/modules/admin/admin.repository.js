const pool = require('../../config/database');

class AdminRepository {
    async getDashboardStats() {
        const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [videoCount] = await pool.query('SELECT COUNT(*) as total FROM videos');

        return {
            users: userCount[0].total,
            videos: videoCount[0].total,
            failed_jobs: 0
        };
    }

    // async getFailedJobs ... removed as queue is gone
}

module.exports = new AdminRepository();
