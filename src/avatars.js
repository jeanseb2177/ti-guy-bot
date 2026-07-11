const path = require('path');
const { detourerFondBlanc, fetchBuffer } = require('./scene');
const { uploadImage } = require('./cloudinary');

const TIGUY_AVATAR_3QUART = path.join(__dirname, '../assets/tiguy_3quart.png');
const TIGUY_AVATAR_COTE   = path.join(__dirname, '../assets/tiguy_cote.png');
const TIGUY_AVATAR_FACE   = path.join(__dirname, '../assets/tiguy_face.png');

const POSES_LOCALES = [TIGUY_AVATAR_FACE, TIGUY_AVATAR_3QUART, TIGUY_AVATAR_COTE];

let urlsCache = null;

// Ne fait le detourage + upload qu'une seule fois par demarrage du serveur,
// puis reutilise les URLs Cloudinary pour toutes les videos suivantes.
async function getAvatarUrls() {
    if (urlsCache) return urlsCache;

    console.log('[AVATARS] Preparation des 3 poses Ti-Guy detourees (une seule fois)...');
    urlsCache = await Promise.all(
        POSES_LOCALES.map(async (cheminLocal, i) => {
            const buffer = await fetchBuffer(cheminLocal);
            const cutout = await detourerFondBlanc(buffer);
            const url = await uploadImage(cutout, `avatar_cutout_${i}`);
            return url;
        })
    );
    console.log('[AVATARS] Pretes:', urlsCache);
    return urlsCache;
}

module.exports = { getAvatarUrls };
