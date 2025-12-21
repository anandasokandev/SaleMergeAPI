const videoService = require('./videos.service');
const { sendResponse, sendError } = require('../../utils/response');
const Joi = require('joi');

const generateSchema = Joi.object({
    text: Joi.string().min(3).required()
});

class VideoController {
    async createRequest(req, res) {
        try {
            // Validate text input
            const { error, value } = generateSchema.validate(req.body);
            if (error) return sendError(res, 400, error.details[0].message);

            // Use hardcoded base video from assets folder
            const path = require('path');
            const fs = require('fs');

            // NOTE: Ideally this filename is configurable or passed in body, but for now hardcoded default
            const baseVideoPath = path.resolve(__dirname, '../../../assets/default_base.mp4');

            if (!fs.existsSync(baseVideoPath)) {
                return sendError(res, 500, 'Server configuration error: Default base video not found in assets/');
            }

            const inputStrict = value.text;

            const result = await videoService.createVideoRequest(req.user.userId, inputStrict, baseVideoPath);

            return sendResponse(res, 202, 'Video generation request accepted', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async listMyVideos(req, res) {
        try {
            const result = await videoService.getUserVideos(req.user.userId);
            return sendResponse(res, 200, 'Videos retrieved', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async getOne(req, res) {
        try {
            const video = await videoService.getVideoById(req.params.id);
            if (!video) return sendError(res, 404, 'Video not found');

            // Check ownership
            if (video.user_id !== req.user.userId && req.user.role !== 'ADMIN') {
                return sendError(res, 403, 'Forbidden');
            }

            return sendResponse(res, 200, 'Video details', video);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }
}

module.exports = new VideoController();
