const path = require('path');
const { detourerFondBlanc, fetchBuffer } = require('./scene');
const { uploadImage } = require('./cloudinary');

const TIGUY_AVATAR_VICTOIRE = path.join(__dirname, '../assets/tiguy_victoire.png');

let urlCache = null;

// Ne fait le detourage + upload qu'une seule fois par demarrage du serveur,
// puis reutilise l'URL Cloudinary pour toutes les videos suivantes.
// (Les scenes principales utilisent maintenant Ti-Guy en 3D anime — seule la pose
// victoire, pour le carton de fin, reste une image 2D detouree.)
async function getOutroAvatarUrl() {
    if (urlCache) return urlCache;

    console.log('[AVATARS] Preparation de la pose victoire Ti-Guy detouree (une seule fois)...');
    const buffer = await fetchBuffer(TIGUY_AVATAR_VICTOIRE);
    const cutout = await detourerFondBlanc(buffer);
    urlCache = await uploadImage(cutout, 'avatar_cutout_victoire');
    console.log('[AVATARS] Prete:', urlCache);
    return urlCache;
}

module.exports = { getOutroAvatarUrl };
