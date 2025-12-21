const jobQueue = require('./jobQueue');
const videoRepository = require('../modules/videos/videos.repository');
const ffmpegService = require('../utils/ffmpeg');
const path = require('path');
const fs = require('fs');
const { log, error } = require('../utils/logger');
require('dotenv').config();

const PROCESS_DELAY = 1000; // 1 second loop delay when no jobs

const processJob = async (job) => {
    log(`Processing job ${job.id} type: ${job.type}`);

    try {
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

        if (job.type === 'GENERATE_AND_MERGE') {
            const { videoId, inputText, baseVideoPath } = payload;

            // Update Video Status to PROCESSING
            await videoRepository.updateStatus(videoId, 'PROCESSING');

            const tempDir = path.resolve(__dirname, '../../temp');
            const uploadsDir = path.resolve(__dirname, '../../uploads');

            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            const tempTextVideo = path.join(tempDir, `text_${videoId}_${Date.now()}.mp4`);
            const finalVideo = path.join(uploadsDir, `final_${videoId}_${Date.now()}.mp4`);

            // 1. Generate Text Video
            log(`Generating text video for job ${job.id}`);
            await ffmpegService.generateTextVideo(inputText, tempTextVideo);

            // 2. Merge with Base Video
            log(`Merging videos for job ${job.id}`);
            await ffmpegService.mergeVideos(tempTextVideo, baseVideoPath, finalVideo);

            // 3. Update DB
            await videoRepository.updateStatus(videoId, 'DONE', finalVideo);

            // Cleanup temp
            if (fs.existsSync(tempTextVideo)) fs.unlinkSync(tempTextVideo);

            log(`Job ${job.id} completed successfully`);

            // 4. Send Email Notification
            const emailService = require('../utils/email');
            const userRepository = require('../modules/users/users.repository');

            // Get user email
            const uId = payload.userId || payload.user_id;
            console.log(`[Email Debug] lookup user id: ${uId}`);

            if (!uId) {
                console.error('[Email Debug] No userId in job payload!');
            } else {
                const user = await userRepository.findById(uId);
                if (user) {
                    console.log(`[Email Debug] Found user: ${user.email}`);
                    const downloadUrl = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${path.basename(finalVideo)}`;
                    await emailService.sendEmail(
                        user.email,
                        'Your Video is Ready!',
                        `<p>Your video has been generated successfully.</p><p><a href="${downloadUrl}">Click here to download</a></p>`
                    );
                } else {
                    console.error(`[Email Debug] User not found for ID: ${uId}`);
                }
            }
        }

        await jobQueue.updateStatus(job.id, 'COMPLETED');
    } catch (err) {
        error(`Job ${job.id} failed`, err);
        await jobQueue.updateStatus(job.id, 'FAILED', err.message);

        // Also update video status
        if (job.type === 'GENERATE_AND_MERGE') {
            const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
            await videoRepository.updateStatus(payload.videoId, 'FAILED');
        }
    }
};

const startWorker = async () => {
    log('Worker started...');
    let running = true;

    // Outer try-catch to prevent crash
    try {
        while (running) {
            try {
                const job = await jobQueue.fetchNextPending();
                if (job) {
                    await processJob(job);
                } else {
                    // Wait before next poll
                    await new Promise(resolve => setTimeout(resolve, PROCESS_DELAY));
                }
            } catch (err) {
                error('Worker polling loop error', err);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (fatalErr) {
        error('Worker Fatal Error', fatalErr);
        process.exit(1);
    }
};

// If run directly
if (require.main === module) {
    startWorker();
}

module.exports = startWorker;
