const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middlewares/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const videoRoutes = require('./modules/videos/videos.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const rateLimit = require('express-rate-limit');

const app = express();

// Parse body params and attache them to req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to check headers
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[DEBUG] ${req.method} ${req.url}`);
        console.log(`[DEBUG] Content-Type: ${req.headers['content-type']}`);
        console.log(`[DEBUG] Body:`, req.body);
    }
    // Ensure req.body is at least an empty object to prevent crashes
    if (!req.body) req.body = {};
    next();
});

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Uploads static access (optional, usually protected or served via CDN/nginx)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Video SaaS API is running' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
