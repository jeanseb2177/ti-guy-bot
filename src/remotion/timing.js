// Duree du fondu enchaine entre chaque scene (utilisee cote render ET cote composition,
// d'ou ce petit module partage plutot qu'une valeur dupliquee dans les deux fichiers).
const TRANSITION_FRAMES = 15; // ~0.5s a 30fps

module.exports = { TRANSITION_FRAMES };
