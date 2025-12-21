const express = require('express');
const videoController = require('./videos.controller');
const authenticate = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate); // ALL video routes require auth

router.post('/generate', (req, res) => videoController.createRequest(req, res));
router.get('/', (req, res) => videoController.listMyVideos(req, res));
router.get('/:id', (req, res) => videoController.getOne(req, res));

module.exports = router;
