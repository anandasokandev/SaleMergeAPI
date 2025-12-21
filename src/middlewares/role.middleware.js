const { sendError } = require('../utils/response');

const authorize = (roles = []) => {
    // roles param can be specific role string or array of strings
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, 'Unauthorized');
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return sendError(res, 403, 'Forbidden. Insufficient permissions.');
        }

        next();
    };
};

module.exports = authorize;
