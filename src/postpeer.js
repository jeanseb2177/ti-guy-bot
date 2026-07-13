const axios = require('axios');

const POSTPEER_API_KEY = process.env.POSTPEER_API_KEY;
const POSTPEER_BASE_URL = 'https://api.postpeer.dev/v1';

if (!POSTPEER_API_KEY) console.error('[POSTPEER] POSTPEER_API_KEY manquante dans les variables d\'environnement');

function headers() {
    return { 'x-access-key': POSTPEER_API_KEY, 'Content-Type': 'application/json' };
}

// Etape 1 (a faire une seule fois par plateforme): obtenir une URL d'autorisation
// L'utilisateur doit ouvrir cette URL dans son navigateur et autoriser le compte.
async function getConnectUrl(platform) {
    const response = await axios.get(`${POSTPEER_BASE_URL}/connect/${platform}`, { headers: headers() });
    return response.data; // { url: 'https://...' }
}

// Lister les comptes deja connectes (pour recuperer les accountId a utiliser)
async function listIntegrations() {
    const response = await axios.get(`${POSTPEER_BASE_URL}/connect/integrations`, { headers: headers() });
    return response.data;
}

// Publier une video sur une ou plusieurs plateformes
// accounts: [{ platform: 'tiktok', accountId: 'acc_xxx' }, ...]
async function publishVideo(videoUrl, caption, accounts) {
    try {
        const response = await axios.post(
            `${POSTPEER_BASE_URL}/posts`,
            {
                content: caption,
                platforms: accounts,
                mediaItems: [{ type: 'video', url: videoUrl }],
                publishNow: true
            },
            { headers: headers(), timeout: 60000 }
        );
        console.log('[POSTPEER] Publication reussie:', JSON.stringify(response.data.platforms));
        return response.data;
    } catch (error) {
        console.error('[POSTPEER] Erreur publication:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { getConnectUrl, listIntegrations, publishVideo };
