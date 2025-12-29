const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

const userRepository = require('../modules/users/users.repository');

const authenticate = async (req, res, next) => {
    let token;

    // Check header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    // Check cookie
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return sendError(res, 401, 'Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user exists and is active
        const user = await userRepository.findById(decoded.userId);
        if (!user) {
            return sendError(res, 401, 'User no longer exists.');
        }

        if (!user.is_active) {
            return sendError(res, 403, 'Account is disabled. Please contact support.');
        }

        req.user = { userId: user.id, role: user.role, credits: user.credits, email: user.email };
        next();
    } catch (err) {
        return sendError(res, 401, 'Invalid token.');
    }
};

module.exports = authenticate;
