const path = require('path');
const { detourerFondBlanc, fetchBuffer } = require('./scene');
const { uploadImage } = require('./cloudinary');

const TIGUY_AVATAR_3QUART  = path.join(__dirname, '../assets/tiguy_3quart.png');
const TIGUY_AVATAR_COTE    = path.join(__dirname, '../assets/tiguy_cote.png');
const TIGUY_AVATAR_FACE    = path.join(__dirname, '../assets/tiguy_face.png');
const TIGUY_AVATAR_VICTOIRE = path.join(__dirname, '../assets/tiguy_victoire.png');

const POSES_LOCALES = [TIGUY_AVATAR_FACE, TIGUY_AVATAR_3QUART, TIGUY_AVATAR_COTE];

let urlsCache = null;

async function detourerEtUploader(cheminLocal, publicId) {
    const buffer = await fetchBuffer(cheminLocal);
    const cutout = await detourerFondBlanc(buffer);
    return uploadImage(cutout, publicId);
}

// Ne fait le detourage + upload qu'une seule fois par demarrage du serveur,
// puis reutilise les URLs Cloudinary pour toutes les videos suivantes.
async function getAvatarUrls() {
    if (urlsCache) return urlsCache;

    console.log('[AVATARS] Preparation des poses Ti-Guy detourees (une seule fois)...');
    const [poses, victoire] = await Promise.all([
        Promise.all(POSES_LOCALES.map((cheminLocal, i) => detourerEtUploader(cheminLocal, `avatar_cutout_${i}`))),
        detourerEtUploader(TIGUY_AVATAR_VICTOIRE, 'avatar_cutout_victoire')
    ]);
    urlsCache = { poses, victoire };
    console.log('[AVATARS] Pretes:', urlsCache);
    return urlsCache;
}

module.exports = { getAvatarUrls };
