const videoRepository = require('./videos.repository');
const ffmpegService = require('../../utils/ffmpeg');
const path = require('path');
const fs = require('fs');
const { log, error } = require('../../utils/logger');
const emailService = require('../../utils/email');
const userRepository = require('../users/users.repository');
// const jobQueue = require('../../jobs/jobQueue'); // Removed


class VideoService {
    async createVideoRequest(userId, inputText, baseVideoPath) {
        // 1. Create record in Video Table
        const videoId = await videoRepository.create(userId, inputText, baseVideoPath);

        // 2. Start Processing Directly (Async)
        // We do not await this, so the API returns immediately.
        this.processVideoGeneration(videoId, userId, inputText, baseVideoPath).catch(err => {
            error(`Background processing failed for video ${videoId}`, err);
        });

        return { videoId, status: 'PENDING' };
    }

    async processVideoGeneration(videoId, userId, inputText, baseVideoPath) {
        log(`Processing video ${videoId} for user ${userId}`);

        try {
            // Update Video Status to PROCESSING
            await videoRepository.updateStatus(videoId, 'PROCESSING');

            const tempDir = path.join(process.cwd(), 'temp');
            const uploadsDir = path.join(process.cwd(), 'uploads');

            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            const tempTextVideo = path.join(tempDir, `text_${videoId}_${Date.now()}.mp4`);
            const finalVideo = path.join(uploadsDir, `final_${videoId}_${Date.now()}.mp4`);

            // 1. Generate Text Video
            log(`Generating text video for video ${videoId}`);
            await ffmpegService.generateTextVideo(inputText, tempTextVideo);

            // 2. Merge with Base Video
            log(`Merging videos for video ${videoId}`);
            await ffmpegService.mergeVideos(tempTextVideo, baseVideoPath, finalVideo);

            // 3. Update DB
            await videoRepository.updateStatus(videoId, 'DONE', finalVideo);

            // Cleanup temp
            if (fs.existsSync(tempTextVideo)) fs.unlinkSync(tempTextVideo);

            log(`Video ${videoId} completed successfully`);

            // 4. Send Email Notification
            // Get user email
            const user = await userRepository.findById(userId);
            if (user) {
                log(`[Email] Found user: ${user.email}`);
                const downloadUrl = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${path.basename(finalVideo)}`;
                await emailService.sendEmail(
                    user.email,
                    'Your Video is Ready!',
                    `<p>Your video has been generated successfully.</p><p><a href="${downloadUrl}">Click here to download</a></p>`
                );
            } else {
                error(`[Email] User not found for ID: ${userId}`);
            }

        } catch (err) {
            error(`Video processing failed for ${videoId}`, err);

            // Also update video status
            await videoRepository.updateStatus(videoId, 'FAILED');
        }
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
