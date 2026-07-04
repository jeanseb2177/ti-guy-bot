require('dotenv').config();
const { startServer } = require('./server');
const { startScheduler } = require('./scheduler');

console.log('');
console.log('🏕️  TI-GUY BOT — Mon Camp de Base');
console.log('========================================');
console.log(`Saison: ${getSaison()}`);
console.log(`Timezone: ${process.env.TZ || 'Europe/Paris'}`);
console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
console.log(`HEYGEN_API_KEY: ${process.env.HEYGEN_API_KEY ? '✅' : '⚠️  Non configure'}`);
console.log(`KLING_ACCESS_KEY: ${process.env.KLING_ACCESS_KEY ? '✅' : '❌'}`);
console.log(`ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? '✅' : '❌'}`);
console.log(`DASHBOARD_PASSWORD: ${process.env.DASHBOARD_PASSWORD ? '✅' : '❌'}`);
console.log('');

startServer();
startScheduler();

function getSaison() {
    const mois = new Date().getMonth() + 1;
    if ([12, 1, 2].includes(mois)) return 'hiver';
    if ([3, 4, 5].includes(mois)) return 'printemps';
    if ([6, 7, 8].includes(mois)) return 'ete';
    return 'automne';
}
