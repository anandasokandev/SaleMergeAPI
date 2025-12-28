require('dotenv').config();
const authService = require('../src/modules/auth/auth.service');
const authenticate = require('../src/middlewares/auth.middleware');
const userRepository = require('../src/modules/users/users.repository');

// Mock response
const res = {
    status: function (code) {
        console.log('Response Status:', code);
        return this;
    },
    json: function (data) {
        console.log('Response JSON:', data);
    }
};

const next = () => console.log('Next called (Success)');

async function test() {
    try {
        console.log('Creating token...');
        // Mock user
        const user = { id: 1, role: 'ADMIN', name: 'Test', email: 'test@test.com' };

        const { token } = await authService.login('temp_admin_test@example.com', 'password123'); // Login logic requires DB access

        // Alternatively, just generate token directly if we trust authService.generateToken
        const manualToken = authService.generateToken(user);
        console.log('Manual Token:', manualToken);

        const req = {
            headers: {
                authorization: `Bearer ${manualToken}`
            }
        };

        console.log('Calling middleware...');
        await authenticate(req, res, next);

    } catch (err) {
        console.error('Test Error:', err);
    }
}

test();
