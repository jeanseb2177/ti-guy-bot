const express = require('express');
const path = require('path');
const { generateConseilScript, generateRevueProduit, generateScriptCustom, getSaison } = require('./generator');
const { generateAudio, getVoices } = require('./elevenlabs');
const { renderTiGuyVideo } = require('./remotionRender');
const { getOutroAvatarUrl } = require('./avatars');
const { uploadVideo, uploadAudio } = require('./cloudinary');
const { saveScript, getAllScripts, updateScript, deleteScript, getScript } = require('./store');
const { getConnectUrl, listIntegrations, publishVideo } = require('./postpeer');
const { ANIMATIONS, ENVIRONMENTS } = require('./animations');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PASSWORD = process.env.DASHBOARD_PASSWORD;
if (!PASSWORD) console.error('[SERVER] DASHBOARD_PASSWORD manquant dans les variables d\'environnement');

function auth(req, res, next) {
    const token = req.headers['x-auth-token'] || req.query.token;
    if (token === PASSWORD) return next();
    res.status(401).json({ error: 'Non autorise' });
}

function notifyTelegram(message) {
    const axios = require('axios');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text: message, parse_mode: 'HTML'
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

app.get('/api/check-ffmpeg', auth, (req, res) => {
    const { exec } = require('child_process');
    exec('which ffmpeg; find / -name ffmpeg 2>/dev/null | head -5; ls /nix/store | grep ffmpeg | head -3', (err, stdout, stderr) => {
        res.json({ stdout, stderr, err: err?.message });
    });
});

app.get('/api/scripts', auth, (req, res) => {
    res.json(getAllScripts());
});

async function genererAvecPipeline(script) {
    try {
        // Etape 1: Audio ElevenLabs + upload Cloudinary (pour que Remotion puisse le charger)
        console.log('[PIPELINE] Etape 1: Audio ElevenLabs...');
        const audio = await generateAudio(script.script);
        const audioBuffer = Buffer.from(audio.audio_base64, 'base64');
        const audioTempPath = `/tmp/tiguy_audio_${script.id}.mp3`;
        require('fs').writeFileSync(audioTempPath, audioBuffer);
        const audioUrl = await uploadAudio(audioTempPath, `audio_${script.id}`);
        updateScript(script.id, { statut: 'audio_pret' });

        // Etape 2: Preparer les 3 scenes (decor + animation 3D + sous-titre reel)
        console.log('[PIPELINE] Etape 2: Preparation des scenes...');
        updateScript(script.id, { statut: 'video_en_cours' });

        const { diviserScript, detectFond, FONDS_OUTDOOR } = require('./fonds');
        const { detecterAnimation, detecterEnvironnement } = require('./animations');
        const outroAvatar = await getOutroAvatarUrl();
        const fondNom = detectFond(script.script);
        const fondUrl = FONDS_OUTDOOR[fondNom];
        const sousTitres = diviserScript(script.script);
        // Un seul decor 3D par video (coherence visuelle entre les 3 actes). Pour un script
        // manuel, l'utilisateur choisit le decor directement (environnementManuel) plutot que
        // de le deviner par mots-cles; sinon detecte sur l'ensemble du script comme le fond 2D.
        // Si rien ne correspond/n'est choisi, la scene retombe sur le fond 2D classique (Video.js).
        const environnement3D = script.environnementManuel !== undefined
            ? (script.environnementManuel || undefined)
            : detecterEnvironnement(script.script);

        // Anime chaque acte selon sa description visuelle reelle (generee par Claude avec le
        // script), ou selon le choix explicite de l'utilisateur pour un script manuel
        // (animationsManuelles), plutot qu'un mapping fixe identique a chaque video.
        const scenes = sousTitres.map((texte, i) => ({
            background: fondUrl,
            animation: (script.animationsManuelles && script.animationsManuelles[i])
                || detecterAnimation(script.scenes && script.scenes[i], i),
            caption: texte.replace(/\*/g, '').replace(/[()]/g, '').trim(),
            environment: environnement3D
        }));

        // Etape 3: Rendu Remotion (compose decor + avatar + sous-titres + audio -> mp4 directement)
        console.log('[PIPELINE] Etape 3: Rendu video Remotion...');
        const outputPath = `/tmp/tiguy_${script.id}.mp4`;
        await renderTiGuyVideo({ audioUrl, audioBuffer, scenes, outroAvatar, outputPath });

        // Etape 4: Upload Cloudinary de la video finale
        console.log('[PIPELINE] Etape 4: Upload Cloudinary...');
        const cloudinaryUrl = await uploadVideo(outputPath, `tiguy_${script.id}`);
        updateScript(script.id, {
            video_url: cloudinaryUrl,
            statut: 'video_prete'
        });

        try { require('fs').unlinkSync(outputPath); } catch (e) {}
        try { require('fs').unlinkSync(audioTempPath); } catch (e) {}

        notifyTelegram(`🎬 <b>Vidéo Ti-Guy prête!</b>\n\n📝 ${script.titre}\n⏱️ ~30 secondes\n\n🔗 <a href="${cloudinaryUrl}">Voir la vidéo</a>\n\nApprouve dans le dashboard!\n\n<i>Ti-Guy Bot — Mon Camp de Base</i>`);
        console.log(`[PIPELINE] Succes! ${cloudinaryUrl}`);

    } catch (error) {
        console.error('[PIPELINE] Erreur:', error.message);
        updateScript(script.id, { statut: 'erreur_pipeline', erreur: error.message });
        const messageEchappe = String(error.message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 500);
        notifyTelegram(`❌ <b>Erreur pipeline Ti-Guy</b>\n\n${messageEchappe}\n\n<i>Ti-Guy Bot</i>`);
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
        console.error('[API] Erreur:', error);
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
        console.error('[API] Erreur:', error);
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
        console.error('[API] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Liste les animations/decors 3D disponibles, pour remplir les menus du dashboard
// (script manuel) sans dupliquer la banque definie dans animations.js.
app.get('/api/options', auth, (req, res) => {
    res.json({ animations: ANIMATIONS, environments: ENVIRONMENTS });
});

// Script ecrit entierement a la main (titre + texte + choix d'animation/decor explicites):
// saute Claude, va direct au rendu. Utile pour tester une combinaison precise ou ecrire
// un script sur mesure sans repasser par la generation IA.
app.post('/api/generate/manuel', auth, async (req, res) => {
    try {
        const { titre, script: texte, hashtags, environment, animations } = req.body;
        if (!texte || !texte.trim()) return res.status(400).json({ error: 'Le texte du script est requis' });

        const script = {
            id: Date.now().toString(),
            type: 'manuel',
            sujet: (titre || texte).substring(0, 50),
            titre: titre || 'Ti-Guy — Mon Camp de Base',
            script: texte.trim(),
            scenes: [],
            animationsManuelles: Array.isArray(animations) ? animations.filter(Boolean) : [],
            environnementManuel: environment || '',
            hashtags: hashtags || 'camping randonnee plein air outdoor france',
            saison: getSaison(),
            date_creation: new Date().toISOString(),
            statut: 'en_attente',
            video_url: null,
            heygen_job_id: null
        };
        saveScript(script);
        genererAvecPipeline(script).catch(e => console.error('[API] Erreur pipeline:', e.message));
        res.json(getScript(script.id));
    } catch (error) {
        console.error('[API] Erreur:', error);
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
        console.error('[API] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/scripts/:id', auth, (req, res) => {
    deleteScript(req.params.id);
    res.json({ success: true });
});

// Etape 1 (une seule fois par plateforme): obtenir le lien d'autorisation TikTok/Instagram
app.get('/api/postpeer/connect/:platform', auth, async (req, res) => {
    try {
        const data = await getConnectUrl(req.params.platform);
        res.json(data);
    } catch (error) {
        console.error('[API] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Voir les comptes deja connectes (et leurs accountId a utiliser dans .env)
app.get('/api/postpeer/integrations', auth, async (req, res) => {
    try {
        const data = await listIntegrations();
        res.json(data);
    } catch (error) {
        console.error('[API] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scripts/:id/publier', auth, async (req, res) => {
    const script = getScript(req.params.id);
    if (!script) return res.status(404).json({ error: 'Script non trouve' });

    const accountsEnv = process.env.POSTPEER_ACCOUNTS; // ex: tiktok:acc_xxx,instagram:acc_yyy
    if (!script.video_url || !accountsEnv) {
        // Fallback: pas de video ou pas de comptes connectes -> on marque juste publie manuellement
        const updated = updateScript(req.params.id, { statut: 'publie', date_publication: new Date().toISOString() });
        return res.json(updated);
    }

    try {
        const accounts = accountsEnv.split(',').map(pair => {
            const [platform, accountId] = pair.split(':');
            return { platform, accountId };
        });
        const caption = `${script.titre}\n\n#${script.hashtags.replace(/,\s*/g, ' #')}`;
        const result = await publishVideo(script.video_url, caption, accounts);
        const updated = updateScript(req.params.id, {
            statut: 'publie',
            date_publication: new Date().toISOString(),
            postpeer_result: result.platforms
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Publication PostPeer echouee: ' + error.message });
    }
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
        console.error('[API] Erreur:', error);
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
