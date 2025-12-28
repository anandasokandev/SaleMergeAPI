const pool = require('../src/config/database');
const bcrypt = require('bcrypt');

async function testFlow() {
    try {
        console.log('Connecting to DB...');
        const email = 'temp_admin_test@example.com';
        const password = 'password123';

        // Ensure user exists
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            console.log('Creating temp admin user...');
            const hash = await bcrypt.hash(password, 10);
            await pool.query('INSERT INTO users (email, password_hash, role, name, is_active) VALUES (?, ?, ?, ?, ?)',
                [email, hash, 'ADMIN', 'Test Admin', true]);
        } else {
            console.log('User exists, ensuring ADMIN role...');
            await pool.query('UPDATE users SET role = "ADMIN", is_active = 1 WHERE email = ?', [email]);
        }

        // Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            throw new Error(`Login Failed: ${JSON.stringify(loginData)}`);
        }

        const token = loginData.data.token;
        console.log('Got Token:', token ? 'YES' : 'NO');
        // console.log('Token:', token);

        // Access Admin Route
        console.log('Accessing /api/admin/users...');
        const usersRes = await fetch('http://localhost:3000/api/admin/users', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const usersData = await usersRes.json();
        console.log('Admin Users Response Status:', usersRes.status);

        if (usersRes.ok) {
            console.log('Success! Users found:', usersData.data.users ? usersData.data.users.length : usersData.data.length);
        } else {
            console.error('Failed:', usersData);
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await pool.end();
    }
}

testFlow();
