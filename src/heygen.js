const axios = require('axios');

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || 'sk_V2_hgu_kvVu3bNy1vF_jamax0RVvqXUtTt2q3mXYCIL0spBQShv';
const HEYGEN_AVATAR_ID = process.env.HEYGEN_AVATAR_ID || 'b29ffd36f69f4a40a03640030179426e';
const HEYGEN_VOICE_ID = process.env.HEYGEN_VOICE_ID || '96bbe68098384730a067ed285021e496';

async function createVideo(script, titre) {
    if (!HEYGEN_API_KEY || !HEYGEN_AVATAR_ID) {
        console.log('HeyGen non configure — simulation mode');
        return { job_id: 'simulation_' + Date.now(), status: 'pending' };
    }
    
    try {
        const response = await axios.post(
            'https://api.heygen.com/v2/video/generate',
            {
                video_inputs: [{
                    character: {
                        type: 'avatar',
                        avatar_id: HEYGEN_AVATAR_ID,
                        avatar_style: 'normal'
                    },
                    voice: {
                        type: 'text',
                        input_text: script,
                        voice_id: HEYGEN_VOICE_ID,
                        speed: 1.0
                    }
                }],
                dimension: { width: 1080, height: 1920 },
                aspect_ratio: '9:16',
                caption: false
            },
            {
                headers: {
                    'X-Api-Key': HEYGEN_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`HeyGen job cree: ${response.data.data?.video_id}`);
        return {
            job_id: response.data.data?.video_id,
            status: 'processing'
        };
    } catch (error) {
        console.error('Erreur HeyGen:', error.response?.data || error.message);
        throw error;
    }
}

async function checkVideoStatus(jobId) {
    if (!HEYGEN_API_KEY || jobId.startsWith('simulation_')) {
        return { status: 'completed', video_url: null };
    }
    
    try {
        const response = await axios.get(
            `https://api.heygen.com/v1/video_status.get?video_id=${jobId}`,
            { headers: { 'X-Api-Key': HEYGEN_API_KEY } }
        );
        
        const data = response.data.data;
        return {
            status: data?.status,
            video_url: data?.video_url || null
        };
    } catch (error) {
        console.error('Erreur statut HeyGen:', error.message);
        return { status: 'error', video_url: null };
    }
}

module.exports = { createVideo, checkVideoStatus };
