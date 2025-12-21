const pool = require('../config/database');

class JobQueue {
    async enqueue(type, payload) {
        const [result] = await pool.query(
            'INSERT INTO job_queue (type, payload, status, created_at) VALUES (?, ?, ?, NOW())',
            [type, JSON.stringify(payload), 'PENDING']
        );
        return result.insertId;
    }

    async fetchNextPending() {
        // Basic locking mechanism: verify functionality if multiple workers. 
        // UPDATE ... LIMIT 1 FOR UPDATE SKIP LOCKED is best for Postgres, but MySQL support varies by version.
        // Simple approach: SELECT ... FOR UPDATE or just atomic update.
        // Optimistic locking: UPDATE job_queue SET status='PROCESSING', locked_at=NOW() WHERE status='PENDING' ORDER BY created_at ASC LIMIT 1;
        // But we need to know WHICH one we grabbed.

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Find one pending job and lock it
            const [rows] = await connection.query(
                'SELECT id, type, payload FROM job_queue WHERE status = ? ORDER BY created_at ASC LIMIT 1 FOR UPDATE',
                ['PENDING']
            );

            if (rows.length === 0) {
                await connection.commit();
                return null;
            }

            const job = rows[0];

            // Mark as PROCESSING
            await connection.query(
                'UPDATE job_queue SET status = ?, locked_at = NOW(), attempts = attempts + 1 WHERE id = ?',
                ['PROCESSING', job.id]
            );

            await connection.commit();
            return job;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    async updateStatus(id, status, error = null) {
        let query = 'UPDATE job_queue SET status = ?, updated_at = NOW()';
        const params = [status];

        if (error) {
            query += ', last_error = ?';
            params.push(error);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);
    }
}

module.exports = new JobQueue();
