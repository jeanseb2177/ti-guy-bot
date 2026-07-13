// Banque d'animations 3D Ti-Guy (Mixamo/FBX) disponibles dans src/remotion/public/animations/
const ANIMATIONS = {
    chute: 'Fall_Flat.fbx',
    marche: 'Unarmed_Walk_Forward.fbx',
    danse: 'Silly_Dancing.fbx',
    assis: 'Sitting_Laughing.fbx'
};

// Choisit l'animation 3D d'un acte a partir de sa description visuelle (generee par Claude,
// en anglais) et de son index (0=obstacle, 1=astuce en action, 2=victoire).
// NB: pour les actes 0 et 1, un seul clip correspond au theme pour l'instant (voir README des
// animations) — ajouter d'autres FBX Mixamo (ex: "Kneeling", "Crouching", "Looking Around")
// pour obtenir une vraie variete sur ces deux actes.
function detecterAnimation(descriptionScene, indexActe) {
    const s = (descriptionScene || '').toLowerCase();

    if (indexActe === 2) {
        if (/\b(sit|sits|sitting|rest|resting|relax|relaxing)\b/.test(s)) return ANIMATIONS.assis;
        if (/\b(dance|dancing|jump|jumping|cheer|cheering|celebrat)\b/.test(s)) return ANIMATIONS.danse;
        // Pas d'indice clair dans la description -> varie aleatoirement pour eviter la repetition
        return Math.random() < 0.5 ? ANIMATIONS.danse : ANIMATIONS.assis;
    }

    if (indexActe === 0) return ANIMATIONS.chute;
    return ANIMATIONS.marche;
}

module.exports = { ANIMATIONS, detecterAnimation };
