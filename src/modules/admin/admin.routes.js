const express = require('express');
const adminController = require('./admin.controller');
const authenticate = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/role.middleware');

const router = express.Router();

// All admin routes need Auth + Role='ADMIN'
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/users', (req, res) => adminController.getUsers(req, res));
router.patch('/users/:id/status', (req, res) => adminController.toggleUserStatus(req, res));
router.post('/users/:id/status', (req, res) => adminController.toggleUserStatus(req, res)); // Alias for POST

router.patch('/users/:id/credits', (req, res) => adminController.updateUserCredits(req, res));
router.post('/users/:id/credits', (req, res) => adminController.updateUserCredits(req, res)); // Alias for POST

router.get('/videos', (req, res) => adminController.getVideos(req, res));
router.delete('/videos/:id', (req, res) => adminController.deleteVideo(req, res));

router.get('/stats', (req, res) => adminController.getStats(req, res));

module.exports = router;
