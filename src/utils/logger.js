const log = (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}]: ${message}`);
};

const error = (message, err) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR]: ${message}`, err);
};

module.exports = { log, error };
