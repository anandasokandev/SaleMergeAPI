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
            .input('color=c=white:s=1280x720:d=5')
            .inputFormat('lavfi')
            .complexFilter([
                `drawtext=text='${text.replace(/:/g, '\\:')}':fontsize=64:fontcolor=black:x=(w-text_w)/2:y=(h-text_h)/2`
            ])
            .outputOptions('-pix_fmt yuv420p')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};

const mergeVideos = (videoPath1, videoPath2, outputPath) => {
    // Legacy support or removal? Keeping for safety if used elsewhere, else replace it.
    // Simplifying to reduce complexity: Just implement mergeThreeVideos or generic merge.
    // Let's implement generic merge or specific 3-way.

    // Existing 2-way merge logic...
    return new Promise((resolve, reject) => {
        // ... (existing logic)
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
            .on('error', (err) => reject(err));
    });
};

const mergeThreeVideos = (path1, path2, path3, outputPath) => {
    return new Promise((resolve, reject) => {
        const filterString =
            '[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0];' +
            '[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v1];' +
            '[2:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v2];' +
            '[v0][v1][v2]concat=n=3:v=1:a=0[v]';

        ffmpeg()
            .input(path1)
            .input(path2)
            .input(path3)
            .complexFilter(filterString)
            .outputOptions('-map [v]')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
};

const mergeFourVideos = (path1, path2, path3, path4, outputPath) => {
    return new Promise((resolve, reject) => {
        const filterString =
            '[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0];' +
            '[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v1];' +
            '[2:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v2];' +
            '[3:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v3];' +
            '[v0][v1][v2][v3]concat=n=4:v=1:a=0[v]';

        ffmpeg()
            .input(path1)
            .input(path2)
            .input(path3)
            .input(path4)
            .complexFilter(filterString)
            .outputOptions('-map [v]')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
};

const mergeMultipleVideos = (videoPaths, outputPath) => {
    return new Promise((resolve, reject) => {
        if (!videoPaths || videoPaths.length === 0) {
            return reject(new Error('No videos provided for merging'));
        }

        const ffmpegCommand = ffmpeg();
        let filterString = '';
        let concatInputs = '';

        videoPaths.forEach((videoPath, index) => {
            ffmpegCommand.input(videoPath);
            // Add scale/pad filter for each input
            filterString += `[${index}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${index}];`;
            concatInputs += `[v${index}]`;
        });

        // Add concat filter
        filterString += `${concatInputs}concat=n=${videoPaths.length}:v=1:a=0[v]`;

        ffmpegCommand
            .complexFilter(filterString)
            .outputOptions('-map [v]')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('FFmpeg Merge Error:', err);
                reject(err);
            });
    });
};

module.exports = { generateTextVideo, mergeVideos, mergeThreeVideos, mergeFourVideos, mergeMultipleVideos };
