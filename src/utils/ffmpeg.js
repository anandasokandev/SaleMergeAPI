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

const generateTextVideo = (content, outputPath, options = {}) => {
    const fontSize = options.fontSize || 64;
    const fontColor = options.fontColor || 'black';
    // Use Arial on Windows, or fallback to default if not found (though hardcoded here)
    const fontFile = 'C:/Windows/Fonts/arial.ttf';

    return new Promise((resolve, reject) => {
        let filterChain = [];

        // 1. Background (Gradient)
        filterChain.push('[0:v][1:v]blend=all_expr=\'A*(1-(X+Y)/(W+H))+B*((X+Y)/(W+H))\':shortest=1[bg]');

        // 2. Decide on Text Drawing
        // Check if content is structured receipt
        if (typeof content === 'object' && content.type === 'receipt') {
            const { header, body, total } = content;

            // Draw Unified Card Background
            // Wide box (x=50, w=1180) to fix overflow, h=690, y=30
            filterChain.push(`[bg]drawbox=x=50:y=30:w=1180:h=690:color=white@0.85:t=fill[v1]`);

            let currentLabel = '[v1]';
            let filterIdx = 2;

            // Helper to add a drawtext step
            const addText = (text, x, y, size, color) => {
                const safeText = String(text).replace(/:/g, '\\:').replace(/'/g, '');
                let options = `fontfile='${fontFile}':text='${safeText}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}`;
                filterChain.push(`${currentLabel}drawtext=${options}[v${filterIdx}]`);
                currentLabel = `[v${filterIdx}]`;
                filterIdx++;
            };

            // Header (Centered, Top)
            // Y=100 ensures it is clearly inside the box (which starts at 30)
            addText(header, '(w-text_w)/2', '100', 36, fontColor);

            // Dynamic Sizing for Body Items
            let startY = 230;
            const maxBodyHeight = 350; // Available vertical space for body
            const itemCount = body.length;

            // Standard values
            let lineSpacing = 45;
            let bodyFontSize = 30;

            // Calculate Scale if needed
            const neededHeight = itemCount * lineSpacing;
            if (neededHeight > maxBodyHeight) {
                // Scale down
                lineSpacing = Math.floor(maxBodyHeight / itemCount);
                // Ensure font isn't too big for new spacing (leave some padding)
                bodyFontSize = Math.floor(lineSpacing * 0.75);
                // Minimum limits to keep readable? 
                if (bodyFontSize < 16) bodyFontSize = 16;
            }

            let lastY = startY;

            body.forEach((item, index) => {
                const yPos = startY + (index * lineSpacing);
                lastY = yPos;
                // Label: x=100 (aligned with wide box left)
                addText(item.label, '100', yPos, bodyFontSize, fontColor);
                // Value: x=1180 (aligned with wide box right)
                addText(item.value, '1180-text_w', yPos, bodyFontSize, fontColor);
            });

            // Total Premium Section (Larger, at bottom)
            // Fixed gap might need scaling too if very tight? 
            // Lets keep it fixed for now, unless overlap. 
            // Better: use relative gap.
            const totalY = lastY + (lineSpacing > 40 ? 70 : 50);

            // "Total Premium" label
            addText('Total Premium', '100', totalY, 50, fontColor);

            // Total Amount Value
            addText(total, '1180-text_w', totalY, 50, fontColor);

            // Final output mapping
            filterChain[filterChain.length - 1] = filterChain[filterChain.length - 1].replace(`[v${filterIdx - 1}]`, '[outv]');


        } else {
            // Simple String Case
            const safeText = String(content).replace(/:/g, '\\:');
            filterChain.push(`[bg]drawtext=fontfile='${fontFile}':text='${safeText}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=white@0.85:boxborderw=60[outv]`);
        }

        ffmpeg()
            .input('color=c=#FFA500:s=1280x720:d=5')
            .inputFormat('lavfi')
            .input('color=c=#00FFFF:s=1280x720:d=5')
            .inputFormat('lavfi')
            .complexFilter(filterChain)
            .outputOptions('-map [outv]')
            .outputOptions('-pix_fmt yuv420p')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('Error generating text video:', err);
                reject(err);
            });
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
