const videoRepository = require('./videos.repository');
const jobQueue = require('../../jobs/jobQueue');

class VideoService {
    async createVideoRequest(userId, inputText, baseVideoPath) {
        // 1. Create record in Video Table
        const videoId = await videoRepository.create(userId, inputText, baseVideoPath);

        // 2. Enqueue Job
        await jobQueue.enqueue('GENERATE_AND_MERGE', {
            videoId,
            userId,
            inputText,
            baseVideoPath
        });

        return { videoId, status: 'PENDING' };
    }

    async getUserVideos(userId) {
        return await videoRepository.findAllByUser(userId);
    }

    async getVideoById(videoId) {
        return await videoRepository.findById(videoId);
    }

    async deleteVideo(videoId) {
        // Also might want to delete files from disk
        return await videoRepository.delete(videoId);
    }
}

module.exports = new VideoService();
