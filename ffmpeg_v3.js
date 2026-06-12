const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TMP_DIR = '/tmp/tiguy';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function downloadFile(url, destPath) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    fs.writeFileSync(destPath, response.data);
    console.log(`[FFMPEG] Telecharge: ${destPath} (${response.data.byteLength} bytes)`);
}

async function saveAudioBuffer(audioBase64, destPath) {
    const buffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(destPath, buffer);
    console.log(`[FFMPEG] Audio sauvegarde: ${destPath} (${buffer.length} bytes)`);
}

function runCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) reject(new Error(stderr || error.message));
            else resolve(stdout);
        });
    });
}

async function mergeAudioVideo(videoUrls, audioBase64, scriptId) {
    const audioPath = path.join(TMP_DIR, `audio_${scriptId}.mp3`);
    const outputPath = path.join(TMP_DIR, `final_${scriptId}.mp4`);

    await saveAudioBuffer(audioBase64, audioPath);

    if (Array.isArray(videoUrls) && videoUrls.length > 1) {
        // Telecharger les clips
        const clipPaths = [];
        for (let i = 0; i < videoUrls.length; i++) {
            const clipPath = path.join(TMP_DIR, `clip_${scriptId}_${i}.mp4`);
            await downloadFile(videoUrls[i], clipPath);
            clipPaths.push(clipPath);
        }

        // Concatener les clips
        const concatPath = path.join(TMP_DIR, `concat_${scriptId}.mp4`);
        const listPath = path.join(TMP_DIR, `list_${scriptId}.txt`);
        const listContent = clipPaths.map(p => `file '${p}'`).join('\n');
        fs.writeFileSync(listPath, listContent);

        console.log('[FFMPEG] Concatenation des clips...');
        await runCmd(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${concatPath}"`);

        // Fusionner avec audio
        console.log('[FFMPEG] Fusion audio + video concatenee...');
        await runCmd(`ffmpeg -y -i "${concatPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`);

        // Nettoyer clips intermediaires
        clipPaths.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
        try { fs.unlinkSync(concatPath); fs.unlinkSync(listPath); } catch(e) {}

    } else {
        // Un seul clip
        const videoUrl = Array.isArray(videoUrls) ? videoUrls[0] : videoUrls;
        const videoPath = path.join(TMP_DIR, `video_${scriptId}.mp4`);
        await downloadFile(videoUrl, videoPath);

        console.log('[FFMPEG] Fusion audio + video...');
        await runCmd(`ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`);
        try { fs.unlinkSync(videoPath); } catch(e) {}
    }

    if (!fs.existsSync(outputPath)) throw new Error('Fichier final non cree par FFmpeg');

    const stats = fs.statSync(outputPath);
    console.log(`[FFMPEG] Succes! Fichier final: ${Math.round(stats.size/1024)}KB`);
    return outputPath;
}

function cleanupScript(scriptId) {
    const files = [
        `audio_${scriptId}.mp3`,
        `video_${scriptId}.mp4`,
        `final_${scriptId}.mp4`,
        `concat_${scriptId}.mp4`,
        `list_${scriptId}.txt`
    ];
    files.forEach(f => {
        const p = path.join(TMP_DIR, f);
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch(e) {}
    });
}

module.exports = { mergeAudioVideo, cleanupScript };
