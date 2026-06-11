const cron = require('node-cron');
const { generateConseilScript, generateRevueProduit } = require('./generator');
const { createVideo } = require('./heygen');
const { saveScript, updateScript } = require('./store');

function startScheduler() {
    // Mardi 8h Europe/Paris — Conseil Plein Air
    cron.schedule('0 8 * * 2', async () => {
        console.log('\n[SCHEDULER] Mardi 8h — Generation Conseil Plein Air');
        try {
            const script = await generateConseilScript();
            saveScript(script);
            
            if (process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID) {
                const heygen = await createVideo(script.script, script.titre);
                updateScript(script.id, { 
                    heygen_job_id: heygen.job_id,
                    statut: 'video_en_cours'
                });
            }
            
            console.log(`[SCHEDULER] Script genere: ${script.titre}`);
        } catch (error) {
            console.error('[SCHEDULER] Erreur mardi:', error.message);
        }
    }, { timezone: 'Europe/Paris' });

    // Jeudi 8h Europe/Paris — Revue Produit
    cron.schedule('0 8 * * 4', async () => {
        console.log('\n[SCHEDULER] Jeudi 8h — Generation Revue Produit');
        try {
            const script = await generateRevueProduit();
            saveScript(script);
            
            if (process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID) {
                const heygen = await createVideo(script.script, script.titre);
                updateScript(script.id, {
                    heygen_job_id: heygen.job_id,
                    statut: 'video_en_cours'
                });
            }
            
            console.log(`[SCHEDULER] Script genere: ${script.titre}`);
        } catch (error) {
            console.error('[SCHEDULER] Erreur jeudi:', error.message);
        }
    }, { timezone: 'Europe/Paris' });

    console.log('[SCHEDULER] Actif — Mardi & Jeudi 8h Europe/Paris');
}

module.exports = { startScheduler };
