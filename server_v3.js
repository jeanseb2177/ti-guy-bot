const express = require('express');
const path = require('path');
const { generateConseilScript, generateRevueProduit, generateScriptCustom } = require('./generator');
const { generateVideo: klingGenerateVideo, checkTaskStatus } = require('./kling');
const { generateAudio, getVoices } = require('./elevenlabs');
const { mergeAudioVideo, cleanupScript } = require('./ffmpeg');
const { uploadVideo } = require('./cloudinary');
const { saveScript, getAllScripts, updateScript, deleteScript, getScript } = require('./store');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PASSWORD = process.env.DASHBOARD_PASSWORD || 'moncampdebase2026';

function auth(req, res, next) {
    const token = req.headers['x-auth-token'] || req.query.token;
    if (token === PASSWORD) return next();
    res.status(401).json({ error: 'Non autorise' });
}

function notifyTelegram(message) {
    const axios = require('axios');
    axios.post(`https://api.telegram.org/bot8805063194:AAHq15LgKNKvIA-XiSUvKSMvSgaGTYVMoL8/sendMessage`, {
        chat_id: '1954477261', text: message, parse_mode: 'HTML'
    }).catch(e => console.error('Telegram erreur:', e.message));
}

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        res.json({ success: true, token: PASSWORD });
    } else {
        res.status(401).json({ error: 'Mot de passe incorrect' });
    }
});

app.get('/api/status', auth, (req, res) => {
    const scripts = getAllScripts();
    res.json({
        status: 'Ti-Guy Bot actif',
        version: '3.0 — 1 video/semaine, jeudi 8h',
        scripts_total: scripts.length,
        en_attente: scripts.filter(s => s.statut === 'en_attente').length,
        approuves: scripts.filter(s => s.statut === 'approuve').length,
        publies: scripts.filter(s => s.statut === 'publie').length
    });
});

app.get('/api/scripts', auth, (req, res) => {
    res.json(getAllScripts());
});

async function genererAvecPipeline(script) {
    try {
        // Etape 1: Audio ElevenLabs
        console.log('[PIPELINE] Etape 1: Audio ElevenLabs...');
        const audio = await generateAudio(script.script);
        updateScript(script.id, { audio_base64: audio.audio_base64, statut: 'audio_pret' });

        // Etape 2: 3 clips Kling en parallele
        console.log('[PIPELINE] Etape 2: Generation 3 clips Kling...');
        const kling = await klingGenerateVideo(script.script);
        updateScript(script.id, { kling_task_ids: kling.task_ids, statut: 'video_en_cours' });

        // Etape 3: Attendre tous les clips (polling 15 sec, max 15 min)
        console.log('[PIPELINE] Etape 3: Attente clips Kling...');
        const videoUrls = [];
        for (const taskId of kling.task_ids) {
            let videoUrl = null;
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 15000));
                const status = await checkTaskStatus(taskId);
                console.log(`[PIPELINE] Task ${taskId}: ${status.status} (${i+1}/60)`);
                if (status.video_url) { videoUrl = status.video_url; break; }
                if (status.status === 'failed') throw new Error(`Clip Kling echoue: ${taskId}`);
            }
            if (!videoUrl) throw new Error(`Timeout clip: ${taskId}`);
            videoUrls.push(videoUrl);
            console.log(`[PIPELINE] Clip pret: ${videoUrl.substring(0, 60)}...`);
        }

        updateScript(script.id, { kling_video_urls: videoUrls, statut: 'fusion_en_cours' });

        // Etape 4: FFmpeg concatene + fusionne audio
        console.log('[PIPELINE] Etape 4: FFmpeg fusion...');
        const currentScript = getScript(script.id);
        const finalPath = await mergeAudioVideo(videoUrls, currentScript.audio_base64, script.id);

        // Etape 5: Upload Cloudinary
        console.log('[PIPELINE] Etape 5: Upload Cloudinary...');
        const cloudinaryUrl = await uploadVideo(finalPath, `tiguy_${script.id}`);
        updateScript(script.id, {
            video_url: cloudinaryUrl,
            statut: 'video_prete',
            audio_base64: null
        });

        cleanupScript(script.id);

        notifyTelegram(`🎬 <b>Vidéo Ti-Guy prête!</b>\n\n📝 ${script.titre}\n⏱️ ~30 secondes\n\n🔗 <a href="${cloudinaryUrl}">Voir la vidéo</a>\n\nApprouve dans le dashboard!\n\n<i>Ti-Guy Bot — Mon Camp de Base</i>`);
        console.log(`[PIPELINE] Succes! ${cloudinaryUrl}`);

    } catch (error) {
        console.error('[PIPELINE] Erreur:', error.message);
        updateScript(script.id, { statut: 'erreur_pipeline', erreur: error.message });
        notifyTelegram(`❌ <b>Erreur pipeline Ti-Guy</b>\n\n${error.message}\n\n<i>Ti-Guy Bot</i>`);
    }
}

// Exporter pour le scheduler
module.exports.genererAvecPipeline = genererAvecPipeline;

app.post('/api/generate/conseil', auth, async (req, res) => {
    try {
        const { sujet } = req.body;
        const script = await generateConseilScript(sujet);
        console.log('[DEBUG] Titre:', script.titre);
        saveScript(script);
        genererAvecPipeline(script).catch(e => console.error('[API] Erreur pipeline:', e.message));
        res.json(getScript(script.id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate/revue', auth, async (req, res) => {
    try {
        const { produit } = req.body;
        const script = await generateRevueProduit(produit);
        console.log('[DEBUG] Titre:', script.titre);
        saveScript(script);
        genererAvecPipeline(script).catch(e => console.error('[API] Erreur pipeline:', e.message));
        res.json(getScript(script.id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate/custom', auth, async (req, res) => {
    try {
        const { instructions } = req.body;
        if (!instructions) return res.status(400).json({ error: 'Instructions requises' });
        const script = await generateScriptCustom(instructions);
        saveScript(script);
        genererAvecPipeline(script).catch(e => console.error('[API] Erreur pipeline:', e.message));
        res.json(getScript(script.id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scripts/:id/approuver', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'approuve' });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

app.post('/api/scripts/:id/rejeter', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'rejete' });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

app.post('/api/scripts/:id/regenerer', auth, async (req, res) => {
    const ancien = getScript(req.params.id);
    if (!ancien) return res.status(404).json({ error: 'Script non trouve' });
    try {
        let nouveau;
        if (ancien.type === 'conseil') nouveau = await generateConseilScript(ancien.sujet);
        else if (ancien.type === 'revue') nouveau = await generateRevueProduit(ancien.sujet);
        else nouveau = await generateScriptCustom(ancien.sujet);
        saveScript(nouveau);
        deleteScript(ancien.id);
        genererAvecPipeline(nouveau).catch(e => console.error('[API] Erreur regen:', e.message));
        res.json(nouveau);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/scripts/:id', auth, (req, res) => {
    deleteScript(req.params.id);
    res.json({ success: true });
});

app.post('/api/scripts/:id/publier', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'publie', date_publication: new Date().toISOString() });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

app.get('/api/scripts/:id/video-status', auth, async (req, res) => {
    const script = getScript(req.params.id);
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json({ status: script.statut, video_url: script.video_url });
});

app.get('/api/voices', auth, async (req, res) => {
    try {
        const voices = await getVoices();
        res.json(voices.map(v => ({ id: v.voice_id, name: v.name })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function startServer() {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SERVER] Ti-Guy Bot v3.0 dashboard: http://localhost:${PORT}`);
    });
}

module.exports.startServer = startServer;
