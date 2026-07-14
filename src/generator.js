const Anthropic = require('@anthropic-ai/sdk');
const { getProduitAleatoire, trouverProduit } = require('./shopify');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TIGUY_PERSONA = `
Tu es Ti-Guy Desbois, ambassadeur passionné de plein air pour Mon Camp de Base (moncampdebase.com).

TON IDENTITE:
- Français de France, expert plein air chevronné et bourré d'humour
- Tu as passé quelques mois au Québec (tu t'y es fait de vrais amis, tu y retournes des que tu peux) — ça t'a laisse des expressions québécoises que tu glisses naturellement, comme un clin d'oeil a cette bande
- Ton accent reste résolument français de France — les expressions québécoises sont un clin d'oeil ponctuel, pas un accent d'emprunt
- Tu n'es PAS le propriétaire de la boutique — tu es un ambassadeur découvreur
- Style: chemise à carreaux, veste avec patches "Camp Life" et "Le sourire du plein air", tuque Carhartt, barbe, grand sourire
- Ta devise: "L'aventure, c'est sérieux... mais pas trop!"

TON STYLE:
- Casual, chaleureux, jamais corporatif
- Humour avant tout: autodérision, punchlines, exagérations comiques — l'humour est ta signature autant que l'expertise plein air
- Expressions québécoises comme clin d'oeil issu de tes amis la-bas: câline, ostie, tabarouette, t'as pas le bon kit, en baptême, en crisse
- Métaphores outdoor uniques et imagées
- Tu concludes TOUJOURS vers moncampdebase.com de façon organique, jamais forcée
- Audience: Français de France (pas Québécois — tu adaptes le vocabulaire principal au français de France, les expressions québécoises restent des touches ponctuelles et non la base du discours)

EXPRESSIONS SIGNATURE TI-GUY (OBLIGATOIRES DANS CHAQUE VIDEO — c'est ce qui rend Ti-Guy reconnaissable et que les gens vont répéter):
1. AU MOMENT DE L'OBSTACLE (Acte 1): utilise TOUJOURS l'exclamation "Ayoye ayoye ayoye!" quand les choses tournent mal — c'est le cri signature de Ti-Guy face a l'adversite.
2. AU MOMENT DE L'ASTUCE QUI MARCHE (Acte 2): utilise TOUJOURS l'expression d'approbation "Ça, c'est ben calé!" pour valider que la technique fonctionne.
3. EN CLOTURE (Acte 3, formule fixe mot pour mot): termine TOUJOURS par "Pis voila le travail, mes bons chums! Le camping c'est sérieux... mais pas trop!" juste avant la mention de moncampdebase.com. C'est la signature de fin — ne JAMAIS la paraphraser ou la remplacer, elle doit etre identique a chaque video pour que la communaute la reconnaisse et se l'approprie.

FORMAT VIDEOS:
- Mardi 8h = Conseil Plein Air: astuce technique vulgarisée avec humour (30-45 secondes)
- Jeudi 8h = Revue Produit: honnête, tranchante, métaphores uniques (30-45 secondes)
- Toujours commencer par une accroche forte les 3 premières secondes
- Structure: Accroche → Problème/Situation → Solution/Conseil → Mention naturelle boutique → CTA fun
`;

async function generateConseilScript(sujet = null) {
    const topic = sujet || await getRandomTopic('conseil');
    
    const response = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: TIGUY_PERSONA,
        messages: [{
            role: 'user',
            content: `Génère un MINI-FILM DE 30 SECONDES pour Ti-Guy, pas juste un conseil raconté à la caméra.

Sujet: ${topic}
Saison: ${getSaison()}
Durée cible: 35-40 secondes de narration (environ 90-100 mots parlés)

STRUCTURE OBLIGATOIRE EN 3 ACTES (un vrai scenario, pas Ti-Guy qui parle en boucle) :
- ACTE 1 (obstacle): Ti-Guy est en pleine action et rencontre un vrai probleme concret lie au sujet (ex: le vent qui rend sa tente impossible a monter, la pluie qui trempe son sac, etc.) Le probleme doit etre VISUEL et physique, pas juste raconte.
- ACTE 2 (astuce en action): Ti-Guy applique PHYSIQUEMENT l'astuce pour resoudre le probleme — on le VOIT faire le geste technique, pas juste l'entendre l'expliquer.
- ACTE 3 (victoire): Le probleme est resolu, Ti-Guy savoure sa victoire (sourire, soulagement, fierte) et fait le lien vers moncampdebase.com.

Le texte parle (SCRIPT) doit accompagner ces 3 actes de facon naturelle, comme si Ti-Guy narrait sa propre aventure en la vivant.
Glisse 1-2 expressions québécoises naturellement.

Format de réponse (respecte exactement ces sections):
## TITRE
[Titre accrocheur pour la vidéo]

## SCRIPT
[Script complet tel que Ti-Guy le dit, suit les 3 actes]

## SCENE1
[Description VISUELLE en anglais de l'ACTE 1 - le probleme concret, action physique, ex: "fighting against strong wind while tent fabric whips violently, struggling to hold poles in place, frustrated expression"]

## SCENE2
[Description VISUELLE en anglais de l'ACTE 2 - le geste technique precis pour appliquer l'astuce, ex: "kneeling down, driving tent stakes at a low angle into the ground, using rocks to weigh down the base, focused and skilled movements"]

## SCENE3
[Description VISUELLE en anglais de l'ACTE 3 - la victoire, ex: "standing proudly next to the now-secured tent despite the wind, big relieved smile, thumbs up to camera"]

## HASHTAGS
[10 hashtags FR pertinents sans #]`
        }]
    });
    
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('Reponse Claude sans bloc texte: ' + JSON.stringify(response.content));
    return parseScript(textBlock.text, 'conseil', topic);
}

async function generateRevueProduit(nomProduit = null) {
    // Va chercher un vrai produit du catalogue Shopify plutot que d'improviser un nom
    // generique: soit celui demande (recherche approximative dans le catalogue), soit
    // un produit au hasard parmi ceux reellement en vente.
    const produitCatalogue = nomProduit ? await trouverProduit(nomProduit) : await getProduitAleatoire();

    // Filet de securite si Shopify n'est pas configure ou que rien n'est trouve: on retombe
    // sur l'ancien comportement (nom generique) plutot que de faire planter la generation,
    // mais c'est signale bien fort dans les logs car ce n'est plus le chemin normal.
    if (!produitCatalogue) {
        console.error('[GENERATOR] Aucun produit Shopify trouve — verifie SHOPIFY_STORE_DOMAIN/SHOPIFY_STOREFRONT_TOKEN. Repli sur un nom generique.');
    }
    const produit = produitCatalogue ? produitCatalogue.titre : (nomProduit || await getRandomTopic('produit'));
    const ficheProduit = produitCatalogue
        ? `Nom exact: ${produitCatalogue.titre}\nDescription reelle: ${produitCatalogue.description || '(pas de description fournie par la boutique)'}\nPrix: ${produitCatalogue.prix ? produitCatalogue.prix + ' ' + produitCatalogue.devise : 'non precise'}\nCategorie: ${produitCatalogue.categorie || 'non precisee'}`
        : `Nom: ${produit} (produit generique, pas de fiche boutique disponible)`;

    const response = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: TIGUY_PERSONA,
        messages: [{
            role: 'user',
            content: `Génère un MINI-FILM DE 30 SECONDES pour une REVUE PRODUIT Ti-Guy, pas juste une revue racontée à la caméra.

FICHE PRODUIT REELLE (vendu sur moncampdebase.com — n'invente AUCUNE caracteristique, fonction ou materiau qui n'est pas dans cette fiche; si un detail manque, reste vague plutot que d'inventer):
${ficheProduit}

Saison: ${getSaison()}
Durée cible: 35-40 secondes (environ 90-100 mots parlés)

STRUCTURE OBLIGATOIRE EN 3 ACTES :
- ACTE 1 (situation): Ti-Guy est en pleine aventure outdoor et rencontre une situation ou le produit va etre teste (ex: pluie soudaine et le poncho). Visuel et physique.
- ACTE 2 (le produit en action): Ti-Guy utilise PHYSIQUEMENT le produit — on le VOIT s'en servir en conditions reelles, pas juste l'entendre en parler. Reste fidele a ce que le produit fait reellement d'apres la fiche.
- ACTE 3 (verdict): Ti-Guy donne son verdict honnête et tranchant (avec metaphore outdoor unique), satisfait ou nuance, et fait le lien vers moncampdebase.com.

Le texte parle (SCRIPT) doit accompagner ces 3 actes naturellement.
Glisse 1-2 expressions québécoises naturellement.

Format de réponse (respecte exactement ces sections):
## TITRE
[Titre accrocheur ex: "Ce poncho m'a sauvé au Mont Blanc"]

## SCRIPT
[Script complet tel que Ti-Guy le dit, suit les 3 actes]

## SCENE1
[Description VISUELLE en anglais de l'ACTE 1 - la situation qui va tester le produit]

## SCENE2
[Description VISUELLE en anglais de l'ACTE 2 - Ti-Guy utilisant physiquement le produit]

## SCENE3
[Description VISUELLE en anglais de l'ACTE 3 - le verdict, expression faciale correspondante, thumbs up ou geste de satisfaction]

## HASHTAGS
[10 hashtags FR pertinents sans #]`
        }]
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('Reponse Claude sans bloc texte: ' + JSON.stringify(response.content));
    return parseScript(textBlock.text, 'revue', produit, produitCatalogue ? produitCatalogue.url : null);
}

async function generateScriptCustom(instructions) {
    const response = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: TIGUY_PERSONA,
        messages: [{
            role: 'user',
            content: `Génère un MINI-FILM DE 30 SECONDES pour Ti-Guy avec ces instructions:
${instructions}
Saison: ${getSaison()}

Structure en 3 actes si possible (obstacle/situation -> action concrete -> resolution), sinon adapte selon les instructions.

Format de réponse (respecte exactement ces sections):
## TITRE
[Titre accrocheur]

## SCRIPT
[Script complet]

## SCENE1
[Description VISUELLE en anglais du debut de la video]

## SCENE2
[Description VISUELLE en anglais du milieu de la video]

## SCENE3
[Description VISUELLE en anglais de la fin de la video]

## HASHTAGS
[10 hashtags FR sans #]`
        }]
    });
    
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('Reponse Claude sans bloc texte: ' + JSON.stringify(response.content));
    return parseScript(textBlock.text, 'custom', instructions.substring(0, 50));
}

function parseScript(text, type, sujet, produitUrl = null) {
    const titre = extractSection(text, 'TITRE');
    const script = extractSection(text, 'SCRIPT');
    const hashtags = extractSection(text, 'HASHTAGS');
    const scene1 = extractSection(text, 'SCENE1');
    const scene2 = extractSection(text, 'SCENE2');
    const scene3 = extractSection(text, 'SCENE3');

    return {
        id: Date.now().toString(),
        type,
        sujet,
        titre: titre || 'Ti-Guy — Mon Camp de Base',
        script: script || text,
        scenes: [scene1, scene2, scene3].filter(s => s && s.length > 0),
        hashtags: hashtags || 'camping randonnee plein air outdoor france',
        produit_url: produitUrl, // lien reel vers la fiche produit Shopify, si la revue en presente un
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

module.exports = { generateConseilScript, generateRevueProduit, generateScriptCustom, getSaison };
