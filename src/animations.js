// Banque d'animations 3D Ti-Guy (Mixamo/FBX) disponibles dans src/remotion/public/animations/
const ANIMATIONS = {
    // Acte 1 (obstacle): la situation tourne mal
    chute: 'Fall_Flat.fbx',
    fatigue: 'Wiping_Sweat.fbx',
    perdu: 'Look_Around.fbx',
    releve: 'Standing_Up.fbx',
    descenteDifficile: 'Climbing_Down.fbx',

    // Acte 2 (astuce en action): Ti-Guy applique la technique
    marche: 'Unarmed_Walk_Forward.fbx',
    marcheAlt: 'Walking.fbx',
    genoux: 'Kneeling_Down.fbx',
    porte: 'Carrying.fbx',
    ramasse: 'Taking_Item.fbx',

    // Acte 3 (victoire): Ti-Guy savoure le resultat
    danse: 'Silly_Dancing.fbx',
    assis: 'Sitting_Laughing.fbx',
    debout: 'Standing.fbx',
    salut: 'Waving_Hello.fbx' // animation sur mesure creee via Blender MCP (pose-a-pose, pas Mixamo)
};

const OBSTACLE = [ANIMATIONS.chute, ANIMATIONS.fatigue, ANIMATIONS.perdu, ANIMATIONS.releve, ANIMATIONS.descenteDifficile];
const ACTION = [ANIMATIONS.marche, ANIMATIONS.marcheAlt, ANIMATIONS.genoux, ANIMATIONS.porte, ANIMATIONS.ramasse];
const VICTOIRE = [ANIMATIONS.danse, ANIMATIONS.assis, ANIMATIONS.debout, ANIMATIONS.salut];

function auHasard(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
}

// Choisit l'animation 3D d'un acte a partir de sa description visuelle (generee par Claude,
// en anglais) et de son index (0=obstacle, 1=astuce en action, 2=victoire).
function detecterAnimation(descriptionScene, indexActe) {
    const s = (descriptionScene || '').toLowerCase();

    if (indexActe === 0) {
        if (/\b(sweat|exhaust|tired|out of breath)\b/.test(s)) return ANIMATIONS.fatigue;
        if (/\b(look(ing)? around|search(ing)?|confus|lost|scan)\b/.test(s)) return ANIMATIONS.perdu;
        if (/\b(climb(ing)? down|descend|steep|slippery slope)\b/.test(s)) return ANIMATIONS.descenteDifficile;
        if (/\b(get(s|ting)? up|stand(s|ing)? (back )?up|rises?)\b/.test(s)) return ANIMATIONS.releve;
        if (/\b(fall(s|ing)?|trip(s|ping)?|stumbl|wind|storm|rain)\b/.test(s)) return ANIMATIONS.chute;
        return auHasard(OBSTACLE);
    }

    if (indexActe === 1) {
        if (/\b(kneel(s|ing)?|stak(e|es|ing))\b/.test(s)) return ANIMATIONS.genoux;
        if (/\b(carry|carrying|haul|load(ing)?)\b/.test(s)) return ANIMATIONS.porte;
        if (/\b(pick(s|ing)? up|grab(s|bing)?|take?s|retriev|reach(es|ing)? for)\b/.test(s)) return ANIMATIONS.ramasse;
        if (/\b(walk|walking|hik(e|ing)|step(s|ping)?|move[sd]?)\b/.test(s)) return Math.random() < 0.5 ? ANIMATIONS.marche : ANIMATIONS.marcheAlt;
        return auHasard(ACTION);
    }

    // indexActe === 2 (victoire)
    if (/\b(wav(e|es|ing)|greet(s|ing)?|hello|hi there)\b/.test(s)) return ANIMATIONS.salut;
    if (/\b(sit|sits|sitting|rest|resting|relax(ing)?)\b/.test(s)) return ANIMATIONS.assis;
    if (/\b(dance|dancing|jump|jumping|cheer|cheering|celebrat)\b/.test(s)) return ANIMATIONS.danse;
    if (/\b(stand(s|ing)? proudly|confident|satisfied|calm)\b/.test(s)) return ANIMATIONS.debout;
    return auHasard(VICTOIRE);
}

module.exports = { ANIMATIONS, detecterAnimation };
