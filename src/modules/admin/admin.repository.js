const pool = require('../../config/database');

class AdminRepository {
    async getDashboardStats() {
        const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [videoCount] = await pool.query('SELECT COUNT(*) as total FROM videos');
        const [failedJobCount] = await pool.query('SELECT COUNT(*) as total FROM job_queue WHERE status = ?', ['FAILED']);

        return {
            users: userCount[0].total,
            videos: videoCount[0].total,
            failed_jobs: failedJobCount[0].total
        };
    }

    async getFailedJobs(limit = 20, offset = 0) {
        const [rows] = await pool.query(
            'SELECT * FROM job_queue WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            ['FAILED', limit, offset]
        );
        return rows;
    }
}

module.exports = new AdminRepository();
