const React = require('react');
const { useRef, useEffect, useState } = require('react');
const { useCurrentFrame, useVideoConfig, staticFile, continueRender, delayRender } = require('remotion');
const { ThreeCanvas } = require('@remotion/three');
const THREE = require('three');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');

// Cache des FBX charges pour ne pas re-parser 26Mo a chaque frame
const cacheFBX = {};

// Animations qui representent un geste ponctuel (pas un mouvement cyclique comme marcher/danser):
// jouees en boucle, elles donnent l'impression que le personnage "bug" en repetant l'action.
// On les joue une seule fois puis on fige la derniere pose pour le reste de la scene.
const ANIMATIONS_UNE_FOIS = new Set([
    'Fall_Flat.fbx',
    'Wiping_Sweat.fbx',
    'Look_Around.fbx',
    'Standing_Up.fbx',
    'Climbing_Down.fbx',
    'Kneeling_Down.fbx',
    'Carrying.fbx',
    'Taking_Item.fbx'
]);

function chargerFBX(url) {
    if (cacheFBX[url]) return cacheFBX[url];
    cacheFBX[url] = new Promise((resolve, reject) => {
        new FBXLoader().load(url, resolve, undefined, reject);
    });
    return cacheFBX[url];
}

function TiGuy3D({ animationFile, durationInFrames }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const [scene, setScene] = useState(null);
    const mixerRef = useRef(null);
    const [handle] = useState(() => delayRender('Chargement animation Ti-Guy 3D'));

    useEffect(() => {
        let annule = false;
        chargerFBX(staticFile(`animations/${animationFile}`)).then((fbx) => {
            if (annule) return;
            fbx.scale.set(0.011, 0.011, 0.011);
            fbx.position.set(0, -1.05, 0);

            const mixer = new THREE.AnimationMixer(fbx);
            if (fbx.animations && fbx.animations.length > 0) {
                const clip = fbx.animations[0];
                const action = mixer.clipAction(clip);
                if (ANIMATIONS_UNE_FOIS.has(animationFile)) {
                    // Ces clips Mixamo sont souvent un aller-retour complet (ex: debout -> accroupi ->
                    // debout). En boucle rapide ca "bug" (le geste se repete plusieurs fois pendant la
                    // scene) ; fige a la derniere frame retombe souvent juste sur "debout" (comme si le
                    // geste n'avait jamais eu lieu). On ralentit plutot le clip pour qu'il dure exactement
                    // la scene entiere: le geste se joue une seule fois, au ralenti, du debut a la fin.
                    const sceneDurationSec = durationInFrames / fps;
                    if (clip.duration > 0 && sceneDurationSec > 0) {
                        action.setEffectiveTimeScale(clip.duration / sceneDurationSec);
                    }
                    action.setLoop(THREE.LoopOnce, 1);
                    action.clampWhenFinished = true;
                }
                action.play();
            }
            mixerRef.current = mixer;
            setScene(fbx);
            continueRender(handle);
        }).catch((err) => {
            console.error('[TIGUY3D] Erreur chargement FBX:', err);
            continueRender(handle);
        });
        return () => { annule = true; };
    }, [animationFile]);

    // Positionner l'animation au bon instant (frame par frame, pas de requestAnimationFrame)
    if (mixerRef.current) {
        mixerRef.current.setTime(frame / fps);
    }

    if (!scene) return null;

    return React.createElement('primitive', { object: scene });
}

function SceneTiGuy3D({ animationFile, durationInFrames }) {
    return React.createElement(ThreeCanvas, {
            width: 1080,
            height: 1920,
            style: { position: 'absolute', top: 0, left: 0 },
            // Cadrage plan rapproche (plutot que le plan large/lointain par defaut de R3F):
            // objectif plus etroit (moins de distorsion) et camera plus proche.
            camera: { position: [0, 0, 3.2], fov: 32 }
        },
        React.createElement('ambientLight', { intensity: 0.8 }),
        React.createElement('directionalLight', { position: [2, 4, 3], intensity: 1.1 }),
        React.createElement('directionalLight', { position: [-2, 2, -3], intensity: 0.4 }),
        React.createElement(TiGuy3D, { animationFile, durationInFrames })
    );
}

module.exports = { SceneTiGuy3D };
