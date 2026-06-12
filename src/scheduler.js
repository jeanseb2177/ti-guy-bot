const cron = require('node-cron');
const { generateRevueProduit } = require('./generator');
const { saveScript } = require('./store');

function startScheduler() {
    // Jeudi 8h Europe/Paris — 1 video par semaine
    cron.schedule('0 8 * * 4', async () => {
        console.log('\n[SCHEDULER] Jeudi 8h — Generation video hebdomadaire Ti-Guy');
        try {
            const script = await generateRevueProduit();
            saveScript(script);
            console.log(`[SCHEDULER] Script genere: ${script.titre}`);
            const { genererAvecPipeline } = require('./server');
            genererAvecPipeline(script).catch(e => console.error('[SCHEDULER] Erreur pipeline:', e.message));
        } catch (error) {
            console.error('[SCHEDULER] Erreur jeudi:', error.message);
        }
    }, { timezone: 'Europe/Paris' });

    console.log('[SCHEDULER] Actif — Jeudi 8h Europe/Paris (1 video/semaine)');
}

module.exports = { startScheduler };
