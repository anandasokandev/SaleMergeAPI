const userRepository = require('../users/users.repository');
const videoRepository = require('../videos/videos.repository');
const adminRepository = require('./admin.repository');
const { sendResponse, sendError } = require('../../utils/response');

class AdminController {
    async getUsers(req, res) {
        try {
            const { limit, offset } = req.query;
            const result = await userRepository.findAll(parseInt(limit) || 20, parseInt(offset) || 0);
            return sendResponse(res, 200, 'Users list', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async toggleUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body; // Expect boolean
            if (typeof is_active !== 'boolean') return sendError(res, 400, 'is_active must be boolean');

            await userRepository.toggleStatus(id, is_active);
            return sendResponse(res, 200, 'User status updated');
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async updateUserCredits(req, res) {
        try {
            const { id } = req.params;
            const { credits } = req.body;
            if (typeof credits !== 'number') return sendError(res, 400, 'credits must be number');

            await userRepository.updateCredits(id, credits);
            return sendResponse(res, 200, 'User credits updated');
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async getVideos(req, res) {
        try {
            const { limit, offset } = req.query;
            const result = await videoRepository.findAll(parseInt(limit) || 20, parseInt(offset) || 0);
            return sendResponse(res, 200, 'All videos', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async deleteVideo(req, res) {
        try {
            const { id } = req.params;
            // Ideally check if exists first
            await videoRepository.delete(id);
            return sendResponse(res, 200, 'Video deleted (admin)');
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }



    async getStats(req, res) {
        try {
            const stats = await adminRepository.getDashboardStats();
            return sendResponse(res, 200, 'Dashboard stats', stats);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }
}

module.exports = new AdminController();
