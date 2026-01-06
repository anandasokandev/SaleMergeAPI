const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

const ffprobePath = require('ffprobe-static').path;

// Set FFMPEG path to the static binary
let finalFfmpegPath = ffmpegPath;
if (process.env.FFMPEG_PATH) {
    finalFfmpegPath = process.env.FFMPEG_PATH;
}

if (finalFfmpegPath) {
    if (fs.existsSync(finalFfmpegPath)) {
        ffmpeg.setFfmpegPath(finalFfmpegPath);
        console.log(`FFmpeg path set to: ${finalFfmpegPath}`);
    } else {
        console.warn(`Warning: FFmpeg binary not found at ${finalFfmpegPath}. Fluent-ffmpeg will rely on system path.`);
    }
}

if (ffprobePath) {
    console.log(`FFprobe path set to: ${ffprobePath}`);
}

const generateTextVideo = (content, outputPath, options = {}) => {
    const fontSize = options.fontSize || 64;
    const fontColor = options.fontColor || 'black';
    // Cross-platform font selection
    let fontFile = 'Arial'; // System default fallback

    // Check for a local asset font first
    const localFontPath = path.join(process.cwd(), 'assets', 'fonts', 'arial.ttf');

    if (fs.existsSync(localFontPath)) {
        fontFile = localFontPath.replace(/\\/g, '/');
    } else if (process.platform === 'win32') {
        fontFile = 'C:/Windows/Fonts/arial.ttf';
    } else {
        // Linux fallbacks
        const linuxFonts = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/freefont/FreeSans.ttf'
        ];
        for (const f of linuxFonts) {
            if (fs.existsSync(f)) {
                fontFile = f;
                break;
            }
        }
    }

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

        // Ensure there is an audio stream for concat consistency
        filterChain.push('[2:a]atrim=duration=5[outa]');

        ffmpeg()
            .input('color=c=#FFA500:s=1280x720:d=5')
            .inputFormat('lavfi')
            .input('color=c=#00FFFF:s=1280x720:d=5')
            .inputFormat('lavfi')
            .input('anullsrc=channel_layout=stereo:sample_rate=44100')
            .inputFormat('lavfi')
            .complexFilter(filterChain)
            .outputOptions('-map [outv]')
            .outputOptions('-map [outa]')
            .outputOptions('-c:a aac')
            .outputOptions('-pix_fmt yuv420p')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('Error generating text video:', err);
                reject(err);
            });
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

            // Normalize audio for consistency (requires all inputs to have audio)
            filterString += `[${index}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${index}];`;

            concatInputs += `[v${index}][a${index}]`;
        });

        // Add concat filter
        filterString += `${concatInputs}concat=n=${videoPaths.length}:v=1:a=1[v][a]`;

        ffmpegCommand
            .complexFilter(filterString)
            .outputOptions('-map [v]')
            .outputOptions('-map [a]')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('FFmpeg Merge Error:', err);
                reject(err);
            });
    });
};

module.exports = { generateTextVideo, mergeMultipleVideos };
