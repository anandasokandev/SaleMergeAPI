const videoRepository = require('./videos.repository');
const ffmpegService = require('../../utils/ffmpeg');
const path = require('path');
const fs = require('fs');
const { log, error } = require('../../utils/logger');
const sendEmail = require('../../utils/email');
const googleDriveService = require('../../utils/googleDrive');
const userRepository = require('../users/users.repository');
// const jobQueue = require('../../jobs/jobQueue'); // Removed


class VideoService {
    async createVideoRequest(userId, name, quote, selectedVideos, baseVideoPath) {
        // Ensure selectedVideos is an array
        const videosToProcess = Array.isArray(selectedVideos) ? selectedVideos : (selectedVideos ? [selectedVideos] : []);

        // 0. Deduct Credit (Atomic)
        const deducted = await userRepository.deductCredit(userId);
        if (!deducted) {
            throw new Error('Insufficient credits. Please check your balance.');
        }

        // 1. Create record in Video Table
        const videoId = await videoRepository.create(userId, JSON.stringify({ name, quote, selectedVideos: videosToProcess }), baseVideoPath);

        // 2. Start Processing Directly (Async)
        this.processVideoGeneration(videoId, userId, name, quote, videosToProcess, baseVideoPath).catch(err => {
            error(`Background processing failed for video ${videoId}`, err);
        });

        return { videoId, status: 'PENDING' };
    }

    async processVideoGeneration(videoId, userId, name, quote, selectedVideos, baseVideoPath) {
        log(`Processing video ${videoId} for user ${userId} with selection ${JSON.stringify(selectedVideos)}`);

        try {
            // Update Video Status to PROCESSING
            await videoRepository.updateStatus(videoId, 'PROCESSING');

            const tempDir = path.join(process.cwd(), 'temp');
            const uploadsDir = path.join(process.cwd(), 'uploads');

            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            const tempNameVideo = path.join(tempDir, `name_${videoId}_${Date.now()}.mp4`);
            const tempQuoteVideo = path.join(tempDir, `quote_${videoId}_${Date.now()}.mp4`);
            const finalVideo = path.join(uploadsDir, `final_${videoId}_${Date.now()}.mp4`);

            // 1. Generate Name Video (Start)
            log(`Generating name video for video ${videoId}`);
            await ffmpegService.generateTextVideo(name, tempNameVideo);

            // 2. Generate Quote Video (End)
            log(`Generating quote video for video ${videoId}`);

            let quoteContent = quote;
            let fontSize = 64;

            if (typeof quote === 'object' && quote !== null) {
                const body = [
                    { label: 'Sum Insured', value: quote.sum_insured },
                    { label: 'Cover Type', value: quote.cover_type },
                    { label: 'Policy Term', value: `${quote.policy_term} Year` }
                ];

                if (quote.addons && quote.addons.length > 0) {
                    quote.addons.forEach(addon => {
                        body.push({ label: addon.name, value: addon.price });
                    });
                }

                quoteContent = {
                    type: 'receipt',
                    header: `Dear ${name},\nthe quote for ${quote.plan_name} is detailed below:`,
                    body: body,
                    total: quote.total_premium
                };
                fontSize = 32;
            }

            await ffmpegService.generateTextVideo(quoteContent, tempQuoteVideo, { fontSize });

            // 3. Merge Videos
            log(`Merging videos for video ${videoId}`);

            const filesToMerge = [];

            // Order: Name -> Base -> [Selected Videos] -> Quote

            filesToMerge.push(tempNameVideo);
            filesToMerge.push(baseVideoPath);

            if (selectedVideos && selectedVideos.length > 0) {
                for (const videoNum of selectedVideos) {
                    const vPath = path.join(process.cwd(), 'assets', 'videos', `${videoNum}.mp4`);
                    if (fs.existsSync(vPath)) {
                        filesToMerge.push(vPath);
                    } else {
                        log(`Warning: Selected video ${videoNum} not found, skipping.`);
                    }
                }
            }

            filesToMerge.push(tempQuoteVideo);

            await ffmpegService.mergeMultipleVideos(filesToMerge, finalVideo);

            // 3. Update DB - Moved to after upload
            // await videoRepository.updateStatus(videoId, 'DONE', finalVideo);

            // Cleanup temp
            if (fs.existsSync(tempNameVideo)) fs.unlinkSync(tempNameVideo);
            if (fs.existsSync(tempQuoteVideo)) fs.unlinkSync(tempQuoteVideo);

            log(`Video ${videoId} completed successfully`);

            // 4. Upload to Google Drive
            log(`Uploading video ${videoId} to Google Drive`);
            let driveLink = '';
            try {
                const uploadResult = await googleDriveService.uploadFile(finalVideo);
                driveLink = uploadResult.webViewLink;
                log(`Uploaded to Drive: ${driveLink}`);
            } catch (uploadErr) {
                error(`Upload to Drive failed for video ${videoId}`, uploadErr);
            }

            // Fallback logic for missing or empty drive link
            if (!driveLink) {
                log(`Drive Link missing/failed, using local fallback.`);
                driveLink = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${path.basename(finalVideo)}`;
            }

            log(`Updating DB for video ${videoId} with link: ${driveLink}`);

            // 3. Update DB
            await videoRepository.updateStatus(videoId, 'DONE', finalVideo, driveLink);

            // Cleanup temp

            // 5. Send Email Notification
            // Get user email
            const user = await userRepository.findById(userId);
            if (user) {
                log(`[Email] Found user: ${user.email}`);
                await sendEmail(
                    user.email,
                    'Your Video is Ready! 🎬',
                    `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">SaleMerge</h1>
                            <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Personalized Video Generation</p>
                        </div>
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">Success! Your video is here.</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                We've finished processing your video request. It's now ready for you to view and download.
                            </p>
                            
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${driveLink}" style="background-color: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                                    View & Download Video
                                </a>
                            </div>

                            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                                If the button above doesn't work, verify the link directly:<br>
                                <a href="${driveLink}" style="color: #4f46e5; word-break: break-all;">${driveLink}</a>
                            </p>
                        </div>
                        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} SaleMerge API. All rights reserved.</p>
                        </div>
                    </div>
                    `
                );
            } else {
                error(`[Email] User not found for ID: ${userId}`);
            }

        } catch (err) {
            error(`Video processing failed for ${videoId}`, err);

            // Refund credit on failure
            await userRepository.addCredit(userId);
            log(`Refunded credit to user ${userId} due to failure`);

            // Also update video status
            await videoRepository.updateStatus(videoId, 'FAILED');
        }
    }

    async getUserVideos(userId, limit = 20, offset = 0) {
        return await videoRepository.findAllByUser(userId, limit, offset);
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
