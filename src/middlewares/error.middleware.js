const { sendError } = require('../utils/response');
const { error } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    error('Unhandled Error:', err);

    if (err.type === 'entity.parse.failed') {
        return sendError(res, 400, 'Invalid JSON payload');
    }

    // Handle other known errors or default to 500
    return sendError(res, 500, 'Internal Server Error');
};

module.exports = errorHandler;
