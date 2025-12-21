const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

const ffprobePath = require('ffprobe-static').path;

// Set FFMPEG path to the static binary
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log(`FFmpeg path set to: ${ffmpegPath}`);
} else if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log(`FFprobe path set to: ${ffprobePath}`);
}

const generateTextVideo = (text, outputPath) => {
    return new Promise((resolve, reject) => {
        // Generate a 5-second video with text
        ffmpeg()
            .input('color=c=black:s=1280x720:d=5')
            .inputFormat('lavfi')
            .complexFilter([
                `drawtext=text='${text.replace(/:/g, '\\:')}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`
            ])
            .outputOptions('-pix_fmt yuv420p')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};

const mergeVideos = (videoPath1, videoPath2, outputPath) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath2)) {
            return reject(new Error(`Base video not found at path: ${videoPath2}`));
        }

        // Simpler command construction
        // "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p"

        const filterString =
            '[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0];' +
            '[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v1];' +
            '[v0][v1]concat=n=2:v=1:a=0[v]';

        ffmpeg()
            .input(videoPath1)
            .input(videoPath2)
            .complexFilter(filterString)
            .outputOptions('-map [v]')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('FFmpeg Merge Error Details:', err);
                reject(err);
            });
    });
};

module.exports = { generateTextVideo, mergeVideos };
