const sharp = require('sharp');
const axios = require('axios');

async function fetchBuffer(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(res.data);
}

// Rend transparents les pixels proches du blanc (fond des images de reference Ti-Guy)
async function detourerFondBlanc(buffer, threshold = 235) {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold) {
            data[i + 3] = 0; // alpha = transparent
        }
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// Compose Ti-Guy (detoure) sur un vrai decor outdoor, format 9:16
async function composerScene(avatarUrl, backgroundUrl) {
    const [avatarBuf, bgBuf] = await Promise.all([fetchBuffer(avatarUrl), fetchBuffer(backgroundUrl)]);

    const cutout = await detourerFondBlanc(avatarBuf);
    const fondRedimensionne = await sharp(bgBuf).resize(1080, 1920, { fit: 'cover' }).toBuffer();
    const avatarRedimensionne = await sharp(cutout).resize({ height: 1550 }).toBuffer();

    return sharp(fondRedimensionne)
        .composite([{ input: avatarRedimensionne, gravity: 'south' }])
        .png()
        .toBuffer();
}

module.exports = { composerScene };
