const path = require('path');
const fs = require('fs');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const getMp3Duration = require('get-mp3-duration');

const FPS = 30;
const DUREE_MIN_PAR_ACTE_SEC = 8; // plancher pour eviter des scenes trop courtes
const DUREE_OUTRO_SEC = 3; // carton de fin avec le bouton moncampdebase.com

let bundleLocationPromise = null;

function getBundleLocation() {
    if (!bundleLocationPromise) {
        console.log('[REMOTION] Bundle en cours (premiere fois seulement)...');
        bundleLocationPromise = bundle({
            entryPoint: path.join(__dirname, 'remotion/index.js'),
            webpackOverride: (config) => ({
                ...config,
                resolve: {
                    ...config.resolve,
                    fallback: {
                        ...(config.resolve && config.resolve.fallback),
                        fs: false, 'node:fs': false,
                        path: false, 'node:path': false,
                        os: false, 'node:os': false,
                        crypto: false, 'node:crypto': false,
                        child_process: false, 'node:child_process': false,
                        net: false, 'node:net': false,
                        tls: false, 'node:tls': false,
                        stream: false, 'node:stream': false,
                        zlib: false, 'node:zlib': false,
                        http: false, 'node:http': false,
                        https: false, 'node:https': false,
                        sharp: false
                    }
                }
            })
        });
    }
    return bundleLocationPromise;
}

// Calcule la duree de chaque acte en frames, en repartissant la duree totale de l'audio
function calculerDureesActes(audioBuffer, nbActes) {
    const dureeAudioMs = getMp3Duration(audioBuffer);
    const dureeAudioSec = Math.max(dureeAudioMs / 1000, DUREE_MIN_PAR_ACTE_SEC * nbActes);
    const dureeParActeSec = dureeAudioSec / nbActes;
    const framesParActe = Math.round(dureeParActeSec * FPS);
    return {
        actDurationsInFrames: new Array(nbActes).fill(framesParActe),
        totalFrames: framesParActe * nbActes,
        dureeAudioSec
    };
}

async function renderTiGuyVideo({ audioUrl, audioBuffer, scenes, outputPath }) {
    const location = await getBundleLocation();

    const { actDurationsInFrames, totalFrames: totalFramesActes } = calculerDureesActes(audioBuffer, scenes.length);

    const outroDurationInFrames = Math.round(DUREE_OUTRO_SEC * FPS);
    const totalFrames = totalFramesActes + outroDurationInFrames;

    const inputProps = { audioUrl, scenes, actDurationsInFrames, outroDurationInFrames };

    console.log(`[REMOTION] Rendu: ${scenes.length} actes + outro, ${totalFrames} frames total (~${(totalFrames / FPS).toFixed(1)}s)`);

    const composition = await selectComposition({
        serveUrl: location,
        id: 'TiGuyVideo',
        inputProps
    });

    await renderMedia({
        composition: { ...composition, durationInFrames: totalFrames, fps: FPS },
        serveUrl: location,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        timeoutInMilliseconds: 300000
    });

    console.log('[REMOTION] Rendu termine:', outputPath);
    return outputPath;
}

module.exports = { renderTiGuyVideo };
