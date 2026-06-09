const express = require('express');
const path = require('path');
const { generateConseilScript, generateRevueProduit, generateScriptCustom } = require('./generator');
const { createVideo, checkVideoStatus } = require('./heygen');
const { saveScript, getAllScripts, updateScript, deleteScript, getScript } = require('./store');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PASSWORD = process.env.DASHBOARD_PASSWORD || 'moncampdebase2026';

// Auth middleware simple
function auth(req, res, next) {
    const token = req.headers['x-auth-token'] || req.query.token;
    if (token === PASSWORD) return next();
    res.status(401).json({ error: 'Non autorise' });
}

// Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        res.json({ success: true, token: PASSWORD });
    } else {
        res.status(401).json({ error: 'Mot de passe incorrect' });
    }
});

// Statut serveur
app.get('/api/status', auth, (req, res) => {
    const scripts = getAllScripts();
    res.json({
        status: 'Ti-Guy Bot actif',
        scripts_total: scripts.length,
        en_attente: scripts.filter(s => s.statut === 'en_attente').length,
        approuves: scripts.filter(s => s.statut === 'approuve').length,
        publies: scripts.filter(s => s.statut === 'publie').length,
        heygen_configure: !!(process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID)
    });
});

// Lister tous les scripts
app.get('/api/scripts', auth, (req, res) => {
    res.json(getAllScripts());
});

// Generer un conseil manuellement
app.post('/api/generate/conseil', auth, async (req, res) => {
    try {
        const { sujet } = req.body;
        console.log(`[API] Generation conseil: ${sujet || 'aleatoire'}`);
        const script = await generateConseilScript(sujet);
        saveScript(script);
        
        if (process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID) {
            const heygen = await createVideo(script.script, script.titre);
            updateScript(script.id, { heygen_job_id: heygen.job_id, statut: 'video_en_cours' });
        }
        
        res.json(getScript(script.id));
    } catch (error) {
        console.error('[API] Erreur generation conseil:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Generer une revue produit manuellement
app.post('/api/generate/revue', auth, async (req, res) => {
    try {
        const { produit } = req.body;
        console.log(`[API] Generation revue: ${produit || 'aleatoire'}`);
        const script = await generateRevueProduit(produit);
        saveScript(script);
        
        if (process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID) {
            const heygen = await createVideo(script.script, script.titre);
            updateScript(script.id, { heygen_job_id: heygen.job_id, statut: 'video_en_cours' });
        }
        
        res.json(getScript(script.id));
    } catch (error) {
        console.error('[API] Erreur generation revue:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Generer un script custom
app.post('/api/generate/custom', auth, async (req, res) => {
    try {
        const { instructions } = req.body;
        if (!instructions) return res.status(400).json({ error: 'Instructions requises' });
        
        const script = await generateScriptCustom(instructions);
        saveScript(script);
        
        if (process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID) {
            const heygen = await createVideo(script.script, script.titre);
            updateScript(script.id, { heygen_job_id: heygen.job_id, statut: 'video_en_cours' });
        }
        
        res.json(getScript(script.id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approuver un script
app.post('/api/scripts/:id/approuver', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'approuve' });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

// Rejeter un script
app.post('/api/scripts/:id/rejeter', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'rejete' });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

// Regenerer un script
app.post('/api/scripts/:id/regenerer', auth, async (req, res) => {
    const ancien = getScript(req.params.id);
    if (!ancien) return res.status(404).json({ error: 'Script non trouve' });
    
    try {
        let nouveau;
        if (ancien.type === 'conseil') {
            nouveau = await generateConseilScript(ancien.sujet);
        } else if (ancien.type === 'revue') {
            nouveau = await generateRevueProduit(ancien.sujet);
        } else {
            nouveau = await generateScriptCustom(ancien.sujet);
        }
        saveScript(nouveau);
        deleteScript(ancien.id);
        res.json(nouveau);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Supprimer un script
app.delete('/api/scripts/:id', auth, (req, res) => {
    deleteScript(req.params.id);
    res.json({ success: true });
});

// Verifier statut video HeyGen
app.get('/api/scripts/:id/video-status', auth, async (req, res) => {
    const script = getScript(req.params.id);
    if (!script?.heygen_job_id) return res.json({ status: 'no_video' });
    
    const status = await checkVideoStatus(script.heygen_job_id);
    if (status.video_url) {
        updateScript(req.params.id, { video_url: status.video_url, statut: 'video_prete' });
    }
    res.json(status);
});

// Marquer comme publie
app.post('/api/scripts/:id/publier', auth, (req, res) => {
    const script = updateScript(req.params.id, { statut: 'publie', date_publication: new Date().toISOString() });
    if (!script) return res.status(404).json({ error: 'Script non trouve' });
    res.json(script);
});

function startServer() {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[SERVER] Ti-Guy Bot dashboard: http://localhost:${PORT}`);
    });
}

module.exports = { startServer };
