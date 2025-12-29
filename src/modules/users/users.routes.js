const express = require('express');
const userController = require('./users.controller');
const authenticate = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Get current user profile
router.get('/me', (req, res) => userController.getProfile(req, res));

// Update current user profile
router.patch('/me', (req, res) => userController.updateProfile(req, res));

module.exports = router;
