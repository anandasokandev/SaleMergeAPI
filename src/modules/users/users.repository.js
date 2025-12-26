const pool = require('../../config/database');

class UserRepository {
    async create(email, passwordHash, role = 'USER', name = null) {
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
            [email, passwordHash, role, name]
        );
        return result.insertId;
    }

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    async findById(id) {
        const [rows] = await pool.query('SELECT id, name, email, role, created_at, credits, is_active FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    async findAll(limit = 10, offset = 0, search = '') {
        let query = 'SELECT id, name, email, role, created_at, credits, is_active FROM users';
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        let params = [];

        if (search) {
            query += ' WHERE email LIKE ? OR name LIKE ?';
            countQuery += ' WHERE email LIKE ? OR name LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);

        // Correctly handle parameters for count query
        const countParams = search ? [`%${search}%`, `%${search}%`] : [];
        const [countResult] = await pool.query(countQuery, countParams);

        return { users: rows, total: countResult[0].total };
    }

    async toggleStatus(id, isActive) {
        await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]);
    }

    async updateCredits(id, credits) {
        await pool.query('UPDATE users SET credits = ? WHERE id = ?', [credits, id]);
    }

    async deductCredit(id) {
        const [result] = await pool.query('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0', [id]);
        return result.affectedRows > 0;
    }

    async addCredit(id) {
        await pool.query('UPDATE users SET credits = credits + 1 WHERE id = ?', [id]);
    }

    async saveResetToken(email, token, expiresAt) {
        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
            [token, expiresAt, email]
        );
    }

    async findByResetToken(token) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );
        return rows[0];
    }

    async updatePassword(id, passwordHash) {
        await pool.query(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [passwordHash, id]
        );
    }

    async update(id, updateData) {
        const allowedFields = ['email', 'role', 'credits', 'is_active', 'name'];
        const updates = [];
        const params = [];

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                params.push(updateData[key]);
            }
        });

        if (updates.length === 0) return; // Nothing to update

        params.push(id);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

        await pool.query(query, params);
    }
}

module.exports = new UserRepository();
