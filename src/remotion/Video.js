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

// Rend transparents les pixels proches du blanc, avec un DEGRADE (pas de coupure nette)
// pour eviter le lisere blanc dur autour des contours/cheveux.
async function detourerFondBlanc(buffer, seuilOpaque = 200, seuilTransparent = 248) {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
        const luminosite = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (luminosite >= seuilTransparent) {
            data[i + 3] = 0; // totalement transparent
        } else if (luminosite <= seuilOpaque) {
            // garder l'alpha d'origine (totalement opaque)
        } else {
            // zone de transition: alpha degrade lineairement entre les deux seuils
            const ratio = (luminosite - seuilOpaque) / (seuilTransparent - seuilOpaque);
            data[i + 3] = Math.round(data[i + 3] * (1 - ratio));
        }
    }
    // Leger flou sur le canal alpha uniquement pour adoucir davantage les bords
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .blur(0.6)
        .png()
        .toBuffer();
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

module.exports = { composerScene, detourerFondBlanc, fetchBuffer };
