const axios = require('axios');

const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY || 'A4Y4mDPkyrQCffHPGkeepnB4Rb99a4BT';
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY || 'NrLQd8Qdgf9DDkmEbJ3YTet8K4KfhKNH';
const KLING_BASE_URL = 'https://api.klingai.com';

// Images Ti-Guy — poses differentes selon situation
const TIGUY_AVATAR_3QUART = 'https://i.imgur.com/bFOdwNy.png'; // 3/4
const TIGUY_AVATAR_COTE   = 'https://i.imgur.com/bstQEF9.png'; // cote
const TIGUY_AVATAR_FACE   = 'https://i.imgur.com/A175fTf.png'; // face

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

function choisirAvatar(fond) {
    if (fond === 'randonnee' || fond === 'montagne') return TIGUY_AVATAR_3QUART;
    if (fond === 'pluie' || fond === 'foret') return TIGUY_AVATAR_COTE;
    return TIGUY_AVATAR_FACE;
}

async function generateVideo(script) {
    try {
        const fond = detectFond(script);
        const avatarUrl = choisirAvatar(fond);

        const scriptPropre = script
            .replace(/\*[^*]+\*/g, '')
            .replace(/\([^)]+\)/g, '')
            .trim();

        console.log(`[KLING] Generation video - fond: ${fond} - avatar: ${avatarUrl}`);
        console.log(`[KLING] Script propre: ${scriptPropre.substring(0, 80)}...`);

        const payload = {
            model_name: 'kling-v1-6',
            image: avatarUrl,
            prompt: `Ti-Guy Desbois, French outdoor guide, speaking directly to camera, ${fond} outdoor background, natural movement, Pixar 3D cartoon style, friendly expression`,
            negative_prompt: 'blurry, distorted, unnatural movement',
            cfg_scale: 0.5,
            mode: 'std',
            aspect_ratio: '9:16',
            duration: '5'
        };

        const response = await axios.post(
            `${KLING_BASE_URL}/v1/videos/image2video`,
            payload,
            { headers: getAuthHeaders(), timeout: 30000 }
        );

        const taskId = response.data?.data?.task_id;
        if (!taskId) throw new Error('Pas de task_id recu de Kling');

        console.log(`[KLING] Task cree: ${taskId}`);
        return { task_id: taskId, status: 'processing', fond };

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
        const status = data?.task_status;
        let video_url = null;

        if (status === 'succeed') {
            video_url = data?.task_result?.videos?.[0]?.url || null;
            if (video_url) {
                notifyTelegram('🎬 <b>Vidéo Ti-Guy Kling prête!</b>\n\nDisponible dans le dashboard.\n\n<i>Ti-Guy Bot — Mon Camp de Base</i>');
            }
        }

        return { status, video_url };
    } catch (error) {
        console.error('[KLING] Erreur statut:', error.message);
        return { status: 'error', video_url: null };
    }
}

function notifyTelegram(message) {
    axios.post(`https://api.telegram.org/bot8805063194:AAHq15LgKNKvIA-XiSUvKSMvSgaGTYVMoL8/sendMessage`, {
        chat_id: '1954477261', text: message, parse_mode: 'HTML'
    }).catch(e => console.error('Telegram erreur:', e.message));
}

module.exports = { generateVideo, checkTaskStatus, detectFond };
