const FONDS_OUTDOOR = {
    pluie:     'https://images.unsplash.com/photo-1501691223387-dd0500403074?w=1080',
    montagne:  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080',
    foret:     'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080',
    camping:   'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1080',
    randonnee: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1080',
    lac:       'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080',
    default:   'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1080'
};

function detectFond(script) {
    const s = script.toLowerCase();
    if (s.includes('pluie') || s.includes('imperméable') || s.includes('poncho')) return 'pluie';
    if (s.includes('mont blanc') || s.includes('montagne') || s.includes('sommet')) return 'montagne';
    if (s.includes('forêt') || s.includes('bois') || s.includes('arbre')) return 'foret';
    if (s.includes('lac') || s.includes('rivière') || s.includes('eau')) return 'lac';
    if (s.includes('randonn') || s.includes('sentier') || s.includes('chemin')) return 'randonnee';
    return 'camping';
}

// Diviser le script en 3 parties egales pour 3 sous-titres/scenes
function diviserScript(script) {
    let propre = script
        .replace(/\*[^*]+\*/g, '')
        .replace(/\([^)]+\)/g, '')
        .trim();

    let phrases = propre.split(/[.!?]+/).filter(p => p.trim().length > 5);

    if (phrases.length === 0) {
        propre = script.replace(/\*/g, '').trim();
        phrases = propre.split(/[.!?]+/).filter(p => p.trim().length > 5);
    }

    if (phrases.length === 0) {
        phrases = [script.trim()];
    }

    const tiers = Math.ceil(phrases.length / 3);
    const parties = [
        phrases.slice(0, tiers).join('. ').trim(),
        phrases.slice(tiers, tiers * 2).join('. ').trim(),
        phrases.slice(tiers * 2).join('. ').trim()
    ].filter(p => p.length > 0);

    return parties.length > 0 ? parties : [script.trim() || 'Ti-Guy explore le grand air.'];
}

module.exports = { FONDS_OUTDOOR, detectFond, diviserScript };
