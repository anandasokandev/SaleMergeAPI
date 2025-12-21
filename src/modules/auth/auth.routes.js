const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/signup', (req, res) => authController.signup(req, res));
router.post('/login', (req, res) => authController.login(req, res));

module.exports = router;
