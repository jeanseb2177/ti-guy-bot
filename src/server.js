const express = require('express');
const path = require('path');
const { generateConseilScript, generateRevueProduit, generateScriptCustom } = require('./generator');
const { createVideo: heygenCreateVideo, checkVideoStatus } = require('./heygen');
const { generateVideo: klingGenerateVideo, checkTaskStatus } = require('./kling');
const { generateAudio, getVoices } = require('./elevenlabs');
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
        version: '2.0 — Kling + ElevenLabs',
        scripts_total: scripts.length,
        en_attente: scripts.filter(s => s.statut === 'en_attente').length,
        approuves: scripts.filter(s => s.statut === 'approuve').length,
        publies: scripts.filter(s => s.statut === 'publie').length,
        heygen_configure: !!(process.env.HEYGEN_API_KEY),
        kling_configure: !!(process.env.KLING_ACCESS_KEY || 'A4Y4mDPkyrQCffHPGkeepnB4Rb99a4BT'),
        elevenlabs_configure: !!(process.env.ELEVENLABS_API_KEY || 'sk_b269cc77630d27fbcd4cf10789ab747d88697f72a3ac80ce')
    });
});

app.get('/api/scripts', auth, (req, res) => {
    res.json(getAllScripts());
});

// Generer avec pipeline complet: Claude → ElevenLabs → Kling
async function genererAvecPipeline(script) {
    try {
        // Etape 1: Generer audio avec ElevenLabs
        console.log('[PIPELINE] Etape 1: Generation audio ElevenLabs...');
        const audio = await generateAudio(script.script);
        updateScript(script.id, { audio_base64: audio.audio_base64, statut: 'audio_pret' });

        // Etape 2: Generer video avec Kling
        console.log('[PIPELINE] Etape 2: Generation video Kling...');
        const AVATAR_URL = 'https://raw.githubusercontent.com/jeanseb2177/ti-guy-bot/main/assets/tiguy_avatar.jpg';
        const kling = await klingGenerateVideo(script.script);
        updateScript(script.id, { kling_task_id: kling.task_id, statut: 'video_en_cours' });

        console.log('[PIPELINE] Pipeline lance avec succes!');
    } catch (error) {
        console.error('[PIPELINE] Erreur:', error.message);
        updateScript(script.id, { statut: 'erreur_pipeline', erreur: error.message });
    }
}

app.post('/api/generate/conseil', auth, async (req, res) => {
    try {
        const { sujet } = req.body;
        console.log(`[API] Generation conseil: ${sujet || 'aleatoire'}`);
        const script = await generateConseilScript(sujet);
        console.log('[DEBUG] Titre:', script.titre);
        console.log('[DEBUG] Script debut:', script.script ? script.script.substring(0, 80) : 'VIDE');
        saveScript(script);

        // Lancer pipeline en arriere-plan
        genererAvecPipeline(script).catch(e => console.error('[API] Erreur pipeline:', e.message));

        res.json(getScript(script.id));
    } catch (error) {
        console.error('[API] Erreur conseil:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate/revue', auth, async (req, res) => {
    try {
        const { produit } = req.body;
        console.log(`[API] Generation revue: ${produit || 'aleatoire'}`);
        const script = await generateRevueProduit(produit);
        console.log('[DEBUG] Titre:', script.titre);
        saveScript(script);

        genererAvecPipeline(script).catch(e => console.error('[API] Erreur pipeline:', e.message));

        res.json(getScript(script.id));
    } catch (error) {
        console.error('[API] Erreur revue:', error.message);
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
        genererAvecPipeline(nouveau).catch(e => console.error('[API] Erreur pipeline regen:', e.message));
        res.json(nouveau);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/scripts/:id', auth, (req, res) => {
    deleteScript(req.params.id);
    res.json({ success: true });
});

// Verifier statut video Kling
app.get('/api/scripts/:id/video-status', auth, async (req, res) => {
    const script = getScript(req.params.id);
    if (!script) return res.status(404).json({ error: 'Script non trouve' });

    if (script.kling_task_id) {
        const status = await checkTaskStatus(script.kling_task_id);
        if (status.video_url) {
            updateScript(req.params.id, { video_url: status.video_url, statut: 'video_prete' });
        }
        return res.json(status);
    }

    if (script.heygen_job_id) {
        const status = await checkVideoStatus(script.heygen_job_id);
        if (status.video_url) {
            updateScript(req.params.id, { video_url: status.video_url, statut: 'video_prete' });
        }
        return res.json(status);
    }

    res.json({ status: 'no_video' });
});

app.post('/api/scripts/:id/publier', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'publie', date_publication: new Date().toISOString() });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

// Route pour lister les voix ElevenLabs disponibles
app.get('/api/voices', auth, async (req, res) => {
    try {
        const voices = await getVoices();
        res.json(voices.map(v => ({ id: v.voice_id, name: v.name, category: v.category })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Telecharger audio d'un script
app.get('/api/scripts/:id/audio', auth, (req, res) => {
    const script = getScript(req.params.id);
    if (!script?.audio_base64) return res.status(404).json({ error: 'Pas d audio disponible' });
    const buffer = Buffer.from(script.audio_base64, 'base64');
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Disposition', `attachment; filename="tiguy_${req.params.id}.mp3"`);
    res.send(buffer);
});

function startServer() {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SERVER] Ti-Guy Bot v2.0 dashboard: http://localhost:${PORT}`);
    });
}

module.exports = { startServer };
