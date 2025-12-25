const pool = require('../../config/database');

class VideoRepository {
    async create(userId, inputText, baseVideoPath) {
        const [result] = await pool.query(
            'INSERT INTO videos (user_id, input_text, base_video_path, status, created_at) VALUES (?, ?, ?, ?, NOW())',
            [userId, inputText, baseVideoPath, 'PENDING']
        );
        return result.insertId;
    }

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM videos WHERE id = ?', [id]);
        return rows[0];
    }

    async findAllByUser(userId, limit = 20, offset = 0) {
        const [rows] = await pool.query(
            'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        const [count] = await pool.query('SELECT COUNT(*) as total FROM videos WHERE user_id = ?', [userId]);
        return { videos: rows, total: count[0].total };
    }

    async findAll(limit = 20, offset = 0) {
        const [rows] = await pool.query(
            'SELECT v.*, u.email as user_email FROM videos v JOIN users u ON v.user_id = u.id ORDER BY v.created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [count] = await pool.query('SELECT COUNT(*) as total FROM videos');
        return { videos: rows, total: count[0].total };
    }

    async updateStatus(id, status, outputPath = null, driveLink = null) {
        let query = 'UPDATE videos SET status = ?';
        const params = [status];

        if (outputPath) {
            query += ', output_video_path = ?';
            params.push(outputPath);
        }

        if (driveLink) {
            query += ', drive_link = ?';
            params.push(driveLink);
        }

        query += ' WHERE id = ?';
        params.push(id);

        console.log('Executing DB Update:', query, params);

        await pool.query(query, params);
    }

    async delete(id) {
        await pool.query('DELETE FROM videos WHERE id = ?', [id]);
    }
}

module.exports = new VideoRepository();
