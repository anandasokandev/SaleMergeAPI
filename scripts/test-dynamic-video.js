const pool = require('../src/config/database');

async function testDynamicVideo() {
    try {
        console.log('Login...');
        // Login as admin/user
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'temp_admin_test@example.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log('Got token');

        // Check credits
        if (loginData.data.user.credits < 1) {
            // give credits
            console.log('Adding credits...');
            await pool.query('UPDATE users SET credits = 100 WHERE id = ?', [loginData.data.user.id]);
        }

        const payload = {
            name: "Dynamic Test User",
            quote_details: {
                plan_name: "Super Flexible Plan",
                total_premium: "Rs. 9999",
                // Dynamic Fields
                policy_term: "20 Years",
                payment_mode: "Annual",
                special_discount: "10%",
                agent_name: "Bond, James Bond"
            },
            videos: [1]
        };

        console.log('Sending Request:', JSON.stringify(payload, null, 2));

        const res = await fetch('http://localhost:3000/api/videos/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Response:', res.status, data);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

testDynamicVideo();
