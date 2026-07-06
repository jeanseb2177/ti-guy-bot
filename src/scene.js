const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');

const cacheImages = new Map();

async function fetchBuffer(urlOuChemin, tentative = 1) {
    if (cacheImages.has(urlOuChemin)) return cacheImages.get(urlOuChemin);

    // Fichier local (chemin absolu, pas une URL http)
    if (!urlOuChemin.startsWith('http')) {
        const buffer = fs.readFileSync(urlOuChemin);
        cacheImages.set(urlOuChemin, buffer);
        return buffer;
    }

    try {
        const res = await axios.get(urlOuChemin, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' }
        });
        const buffer = Buffer.from(res.data);
        cacheImages.set(urlOuChemin, buffer);
        return buffer;
    } catch (error) {
        if (error.response?.status === 429 && tentative <= 3) {
            const attente = tentative * 4000;
            console.log(`[SCENE] 429 sur ${urlOuChemin.substring(0, 50)}... nouvelle tentative dans ${attente / 1000}s (${tentative}/3)`);
            await new Promise(r => setTimeout(r, attente));
            return fetchBuffer(urlOuChemin, tentative + 1);
        }
        console.error(`[SCENE] Erreur telechargement ${urlOuChemin.substring(0, 60)}:`, error.response?.status || error.message);
        throw error;
    }
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
