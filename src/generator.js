const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TIGUY_PERSONA = `
Tu es Ti-Guy Desbois, ambassadeur passionné de plein air pour Mon Camp de Base (moncampdebase.com).

TON IDENTITE:
- Français de France, guide de plein air expérimenté
- Tu as voyagé au Québec et tu en es revenu changé — tu glisses des expressions québécoises comme signature
- Tu n'es PAS le propriétaire de la boutique — tu es un ambassadeur découvreur
- Style: chemise à carreaux, veste avec patches "Camp Life" et "Le sourire du plein air", tuque Carhartt, barbe, grand sourire
- Ta devise: "L'aventure, c'est sérieux... mais pas trop!"

TON STYLE:
- Casual, chaleureux, jamais corporatif
- Humour bienveillant et autodérision
- Expressions québécoises comme signature: câline, ostie, tabarouette, t'as pas le bon kit, en baptême, en crisse
- Métaphores outdoor uniques et imagées
- Tu concludes TOUJOURS vers moncampdebase.com de façon organique, jamais forcée
- Audience: Français de France (pas Québécois — tu adaptes le vocabulaire principal au français de France)

FORMAT VIDEOS:
- Mardi 8h = Conseil Plein Air: astuce technique vulgarisée avec humour (30-45 secondes)
- Jeudi 8h = Revue Produit: honnête, tranchante, métaphores uniques (30-45 secondes)
- Toujours commencer par une accroche forte les 3 premières secondes
- Structure: Accroche → Problème/Situation → Solution/Conseil → Mention naturelle boutique → CTA fun
`;

async function generateConseilScript(sujet = null) {
    const topic = sujet || await getRandomTopic('conseil');
    
    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 600,
        system: TIGUY_PERSONA,
        messages: [{
            role: 'user',
            content: `Génère un script vidéo CONSEIL PLEIN AIR pour Ti-Guy.
Sujet: ${topic}
Saison: ${getSaison()}
Durée cible: 35-40 secondes (environ 90-100 mots parlés)

Le script doit:
- Commencer par une accroche visuelle forte (Ti-Guy EN SITUATION)
- Donner UN conseil pratique concret
- Glisser 1-2 expressions québécoises naturellement
- Mentionner moncampdebase.com organiquement à la fin
- Être fun, pas corporatif

Format de réponse:
## TITRE
[Titre accrocheur pour la vidéo]

## SCRIPT
[Script complet tel que Ti-Guy le dit, avec indications de ton entre parenthèses si nécessaire]

## HASHTAGS
[10 hashtags FR pertinents sans #]`
        }]
    });
    
    return parseScript(response.content[0].text, 'conseil', topic);
}

async function generateRevueProduit(nomProduit = null) {
    const produit = nomProduit || await getRandomTopic('produit');
    
    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 600,
        system: TIGUY_PERSONA,
        messages: [{
            role: 'user',
            content: `Génère un script vidéo REVUE PRODUIT pour Ti-Guy.
Produit: ${produit}
Saison: ${getSaison()}
Durée cible: 35-40 secondes (environ 90-100 mots parlés)

La revue doit:
- Commencer par Ti-Guy EN SITUATION avec le produit (pas devant une caméra)
- Être honnête et tranchante — une vraie opinion de terrain
- Utiliser une métaphore outdoor unique et mémorable
- Glisser 1-2 expressions québécoises naturellement
- Conclure vers moncampdebase.com de façon naturelle

Format de réponse:
## TITRE
[Titre accrocheur ex: "Ce poncho m'a sauvé au Mont Blanc"]

## SCRIPT
[Script complet tel que Ti-Guy le dit]

## HASHTAGS
[10 hashtags FR pertinents sans #]`
        }]
    });
    
    return parseScript(response.content[0].text, 'revue', produit);
}

async function generateScriptCustom(instructions) {
    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 600,
        system: TIGUY_PERSONA,
        messages: [{
            role: 'user',
            content: `Génère un script vidéo Ti-Guy avec ces instructions:
${instructions}
Saison: ${getSaison()}

Format de réponse:
## TITRE
[Titre accrocheur]

## SCRIPT
[Script complet]

## HASHTAGS
[10 hashtags FR sans #]`
        }]
    });
    
    return parseScript(response.content[0].text, 'custom', instructions.substring(0, 50));
}

function parseScript(text, type, sujet) {
    const titre = extractSection(text, 'TITRE');
    const script = extractSection(text, 'SCRIPT');
    const hashtags = extractSection(text, 'HASHTAGS');
    
    return {
        id: Date.now().toString(),
        type,
        sujet: sujet || 'aleatoire',
        titre: titre || 'Ti-Guy — Mon Camp de Base',
        script: script || text,
        hashtags: hashtags || 'camping randonnee plein air outdoor france',
        saison: getSaison(),
        date_creation: new Date().toISOString(),
        statut: 'en_attente',
        video_url: null,
        heygen_job_id: null
    };
}

function extractSection(text, section) {
    const m = text.match(new RegExp(`##\\s*${section}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i'));
    return m ? m[1].trim() : '';
}

async function getRandomTopic(type) {
    const conseils = [
        'comment choisir ses chaussures de randonnée',
        'comment lire une carte topographique',
        'les 10 essentiels à mettre dans son sac',
        'comment monter une tente par vent fort',
        'économiser de l\'eau en randonnée',
        'choisir son sac de couchage selon la saison',
        'protéger son matériel de la pluie',
        'comment faire du feu en toute sécurité'
    ];
    
    const produits = [
        'poncho imperméable',
        'lampe frontale rechargeable',
        'sac à dos 40L',
        'réchaud ultraléger',
        'sac de couchage 3 saisons',
        'bouteille isotherme',
        'tente 2 places',
        'bâtons de randonnée'
    ];
    
    const list = type === 'conseil' ? conseils : produits;
    return list[Math.floor(Math.random() * list.length)];
}

function getSaison() {
    const mois = new Date().getMonth() + 1;
    if ([12, 1, 2].includes(mois)) return 'hiver';
    if ([3, 4, 5].includes(mois)) return 'printemps';
    if ([6, 7, 8].includes(mois)) return 'été';
    return 'automne';
}

module.exports = { generateConseilScript, generateRevueProduit, generateScriptCustom };
