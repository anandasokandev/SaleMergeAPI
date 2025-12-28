const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
console.log('Secret loaded:', secret ? 'YES' : 'NO');
if (secret) {
    console.log('Secret value:', secret);
}

const tokenPayload = { userId: 1, role: 'ADMIN' };
const token = jwt.sign(tokenPayload, secret, { expiresIn: '1d' });
console.log('Generated Token:', token);

try {
    const decoded = jwt.verify(token, secret);
    console.log('Verification Successful:', decoded);
} catch (err) {
    console.error('Verification Failed:', err.message);
}
