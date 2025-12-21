const pool = require('../../config/database');

class UserRepository {
    async create(email, passwordHash, role = 'USER') {
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
            [email, passwordHash, role]
        );
        return result.insertId;
    }

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    async findById(id) {
        const [rows] = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    async findAll(limit = 10, offset = 0) {
        const [rows] = await pool.query(
            'SELECT id, email, role, created_at FROM users LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
        return { users: rows, total: countResult[0].total };
    }

    async updateStatus(id, status) {
        // Implementing block/unblock if needed later, or general update
        // For now, maybe just delete or update role
    }
}

module.exports = new UserRepository();
