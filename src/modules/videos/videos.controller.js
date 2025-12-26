const videoService = require('./videos.service');
const { sendResponse, sendError } = require('../../utils/response');
const Joi = require('joi');

const generateSchema = Joi.object({
    name: Joi.string().min(3).required(),
    quote: Joi.string().optional(),
    quote_details: Joi.object({
        plan_name: Joi.string().required(),
        sum_insured: Joi.string().required(),
        cover_type: Joi.string().required(),
        policy_term: Joi.string().required(),
        addons: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                price: Joi.string().required()
            })
        ).optional(),
        total_premium: Joi.string().required()
    }).optional(),
    videos: Joi.array().items(Joi.number().min(1).max(7)).optional(),
    video: Joi.number().min(1).max(7).optional() // Backward compatibility
});

class VideoController {
    async createRequest(req, res) {
        try {
            // Validate text input
            const { error, value } = generateSchema.validate(req.body);
            if (error) return sendError(res, 400, error.details[0].message);

            if (!value.quote && !value.quote_details) {
                return sendError(res, 400, 'Either "quote" or "quote_details" is required.');
            }

            // Check credits
            if (req.user.role !== 'ADMIN' && req.user.credits <= 0) {
                return sendError(res, 403, 'Insufficient credits. Please contact support to purchase more.');
            }

            // Use hardcoded base video from assets folder
            const path = require('path');
            const fs = require('fs');

            // NOTE: Ideally this filename is configurable or passed in body, but for now hardcoded default
            const baseVideoPath = path.resolve(__dirname, '../../../assets/default_base.mp4');

            if (!fs.existsSync(baseVideoPath)) {
                return sendError(res, 500, 'Server configuration error: Default base video not found in assets/');
            }

            // Determine selected videos (prefer 'videos' array, fallback to 'video' for backward compatibility)
            let selectedVideos = value.videos || [];
            if (value.video && !selectedVideos.includes(value.video)) {
                selectedVideos.push(value.video);
            }

            const quotePayload = value.quote_details || value.quote;
            const result = await videoService.createVideoRequest(req.user.userId, value.name, quotePayload, selectedVideos, baseVideoPath);

            return sendResponse(res, 202, 'Video generation request accepted', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async listMyVideos(req, res) {
        try {
            const { limit, offset } = req.query;
            const result = await videoService.getUserVideos(req.user.userId, parseInt(limit) || 20, parseInt(offset) || 0);
            return sendResponse(res, 200, 'Videos retrieved', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async listUserVideos(req, res) {
        try {
            const { userId } = req.params;
            const { limit, offset } = req.query;

            // Access control: Allow if Admin OR if requesting own data
            if (req.user.role !== 'ADMIN' && req.user.userId != userId) {
                return sendError(res, 403, 'Forbidden: You can only view your own videos.');
            }

            const result = await videoService.getUserVideos(userId, parseInt(limit) || 20, parseInt(offset) || 0);
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
