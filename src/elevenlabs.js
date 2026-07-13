const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) console.error('[ELEVENLABS] ELEVENLABS_API_KEY manquante dans les variables d\'environnement');
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Voice ID Ti-Guy — a configurer apres avoir clone la voix dans ElevenLabs
const TIGUY_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || null;

// Voix francaise masculine de fallback si pas de clone
// (a verifier/reecouter sur elevenlabs.io/voice-library si le rendu ne convient pas)
const FALLBACK_VOICE_ID = 'sFdj2KJkJptrv9nt0o2Q'; // Sam - voix FR jeune/grave, sarcastique

async function generateAudio(script) {
    try {
        // Nettoyer le script des didascalies
        const scriptPropre = script
            .replace(/\*[^*]+\*/g, '')
            .replace(/\([^)]+\)/g, '')
            .replace(/\n+/g, ' ')
            .trim();

        const voiceId = TIGUY_VOICE_ID || FALLBACK_VOICE_ID;
        console.log(`[ELEVENLABS] Generation audio - voice: ${voiceId}`);
        console.log(`[ELEVENLABS] Script: ${scriptPropre.substring(0, 80)}...`);

        const response = await axios.post(
            `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
            {
                text: scriptPropre,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.35,
                    similarity_boost: 0.85,
                    style: 0.7,
                    use_speaker_boost: true,
                    speed: 1.1
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            }
        );

        // Convertir en base64 pour stockage temporaire
        const audioBase64 = Buffer.from(response.data).toString('base64');
        console.log(`[ELEVENLABS] Audio genere: ${response.data.byteLength} bytes`);

        return {
            audio_base64: audioBase64,
            audio_size: response.data.byteLength,
            content_type: 'audio/mpeg'
        };

    } catch (error) {
        console.error('[ELEVENLABS] Erreur:', error.response?.data || error.message);
        throw error;
    }
}

async function getVoices() {
    try {
        const response = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
            headers: { 'xi-api-key': ELEVENLABS_API_KEY }
        });
        return response.data.voices || [];
    } catch (error) {
        console.error('[ELEVENLABS] Erreur getVoices:', error.message);
        return [];
    }
}

async function cloneVoice(name, audioFiles) {
    try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('name', name);
        form.append('description', 'Voix Ti-Guy Desbois — Mon Camp de Base');
        audioFiles.forEach((file, i) => {
            form.append('files', file, `sample_${i}.mp3`);
        });

        const response = await axios.post(
            `${ELEVENLABS_BASE_URL}/voices/add`,
            form,
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    ...form.getHeaders()
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('[ELEVENLABS] Erreur clone voix:', error.message);
        throw error;
    }
}

module.exports = { generateAudio, getVoices, cloneVoice };
