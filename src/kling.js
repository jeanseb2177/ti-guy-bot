const axios = require('axios');
const { composerScene } = require('./scene');
const { uploadImage } = require('./cloudinary');

const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;
if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
    console.error('[KLING] KLING_ACCESS_KEY / KLING_SECRET_KEY manquants dans les variables d\'environnement');
}
const KLING_BASE_URL = 'https://api.klingai.com';

// Images Ti-Guy — 3 poses
const TIGUY_AVATAR_3QUART = 'https://i.imgur.com/bFOdwNy.png';
const TIGUY_AVATAR_COTE   = 'https://i.imgur.com/bstQEF9.png';
const TIGUY_AVATAR_FACE   = 'https://i.imgur.com/A175fTf.png';

const FONDS_OUTDOOR = {
    pluie:     'https://images.unsplash.com/photo-1501691223387-dd0500403074?w=1080',
    montagne:  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080',
    foret:     'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080',
    camping:   'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1080',
    randonnee: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1080',
    lac:       'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080',
    default:   'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1080'
};

function getAuthHeaders() {
    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
        { iss: KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5 },
        KLING_SECRET_KEY,
        { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
    );
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function detectFond(script) {
    const s = script.toLowerCase();
    if (s.includes('pluie') || s.includes('imperméable') || s.includes('poncho')) return 'pluie';
    if (s.includes('mont blanc') || s.includes('montagne') || s.includes('sommet')) return 'montagne';
    if (s.includes('forêt') || s.includes('bois') || s.includes('arbre')) return 'foret';
    if (s.includes('lac') || s.includes('rivière') || s.includes('eau')) return 'lac';
    if (s.includes('randonn') || s.includes('sentier') || s.includes('chemin')) return 'randonnee';
    return 'camping';
}

const POSES = [TIGUY_AVATAR_FACE, TIGUY_AVATAR_3QUART, TIGUY_AVATAR_COTE];

// Actions d'aventure par position dans la video (au lieu de "parler a la camera")
const ACTIONS_PAR_SCENE = [
    'arriving at the location, looking around with excitement, natural walking motion, discovering the environment',
    'actively demonstrating the gear or technique with enthusiastic hand gestures, engaged natural movement',
    'giving a big thumbs up and warm smile directly at viewer, celebratory natural movement, inviting gesture'
];

// Diviser le script en 3 parties egales pour 3 clips de 10 secondes
function diviserScript(script) {
    const propre = script
        .replace(/\*[^*]+\*/g, '')
        .replace(/\([^)]+\)/g, '')
        .trim();

    const phrases = propre.split(/[.!?]+/).filter(p => p.trim().length > 5);
    const tiers = Math.ceil(phrases.length / 3);

    return [
        phrases.slice(0, tiers).join('. ').trim(),
        phrases.slice(tiers, tiers * 2).join('. ').trim(),
        phrases.slice(tiers * 2).join('. ').trim()
    ].filter(p => p.length > 0);
}

async function postAvecRetry(payload, tentative = 1) {
    try {
        return await axios.post(
            `${KLING_BASE_URL}/v1/videos/image2video`,
            payload,
            { headers: getAuthHeaders(), timeout: 30000 }
        );
    } catch (error) {
        if (error.response?.status === 429 && tentative <= 3) {
            const attente = tentative * 5000; // 5s, 10s, 15s
            console.log(`[KLING] 429 recu, nouvelle tentative dans ${attente / 1000}s (${tentative}/3)...`);
            await new Promise(r => setTimeout(r, attente));
            return postAvecRetry(payload, tentative + 1);
        }
        throw error;
    }
}

async function genererUnClip(avatarUrl, fondUrl, fondNom, prompt, clipIndex) {
    // Composer Ti-Guy detoure sur le vrai decor AVANT d'envoyer a Kling
    console.log(`[KLING] Composition scene ${clipIndex + 1}/3 (decor: ${fondNom})...`);
    const sceneBuffer = await composerScene(avatarUrl, fondUrl);
    const sceneUrl = await uploadImage(sceneBuffer, `scene_${Date.now()}_${clipIndex}`);

    const action = ACTIONS_PAR_SCENE[clipIndex % ACTIONS_PAR_SCENE.length];

    const payload = {
        model_name: 'kling-v1-6',
        image: sceneUrl,
        prompt: `Ti-Guy Desbois, French outdoor guide, ${action}, ${fondNom} outdoor setting, Pixar 3D cartoon style, friendly expression, scene ${clipIndex + 1} of 3`,
        negative_prompt: 'blurry, distorted, unnatural movement, text, watermark, static, motionless',
        cfg_scale: 0.5,
        mode: 'std',
        aspect_ratio: '9:16',
        duration: '10'
    };

    const response = await postAvecRetry(payload);

    const taskId = response.data?.data?.task_id;
    if (!taskId) throw new Error(`Pas de task_id pour clip ${clipIndex + 1}`);
    console.log(`[KLING] Clip ${clipIndex + 1}/3 task: ${taskId}`);
    return taskId;
}

async function generateVideo(script) {
    try {
        const fondNom = detectFond(script);
        const fondUrl = FONDS_OUTDOOR[fondNom];
        const parties = diviserScript(script);

        console.log(`[KLING] Generation 3 clips - decor: ${fondNom}`);
        console.log(`[KLING] Script divise en ${parties.length} parties`);

        // Lancer les 3 clips l'un apres l'autre (espaces de 3s) pour eviter le rate limit Kling
        const taskIds = [];
        for (let i = 0; i < parties.length; i++) {
            const taskId = await genererUnClip(POSES[i % POSES.length], fondUrl, fondNom, parties[i], i);
            taskIds.push(taskId);
            if (i < parties.length - 1) await new Promise(r => setTimeout(r, 3000));
        }

        return { task_ids: taskIds, status: 'processing', fond: fondNom, nb_clips: taskIds.length };

    } catch (error) {
        console.error('[KLING] Erreur generation:', error.response?.data || error.message);
        throw error;
    }
}

async function checkTaskStatus(taskId) {
    try {
        const response = await axios.get(
            `${KLING_BASE_URL}/v1/videos/image2video/${taskId}`,
            { headers: getAuthHeaders(), timeout: 15000 }
        );
        const data = response.data?.data;
        return {
            status: data?.task_status,
            video_url: data?.task_result?.videos?.[0]?.url || null
        };
    } catch (error) {
        console.error('[KLING] Erreur statut:', error.message);
        return { status: 'error', video_url: null };
    }
}

function notifyTelegram(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text: message, parse_mode: 'HTML'
    }).catch(e => console.error('Telegram erreur:', e.message));
}

module.exports = { generateVideo, checkTaskStatus, detectFond, diviserScript };
