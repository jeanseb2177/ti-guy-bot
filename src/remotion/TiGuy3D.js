const React = require('react');
const { useRef, useEffect, useState } = require('react');
const { useCurrentFrame, useVideoConfig, staticFile, continueRender, delayRender } = require('remotion');
const { ThreeCanvas } = require('@remotion/three');
const THREE = require('three');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');

// Cache des FBX charges pour ne pas re-parser 26Mo a chaque frame
const cacheFBX = {};

function chargerFBX(url) {
    if (cacheFBX[url]) return cacheFBX[url];
    cacheFBX[url] = new Promise((resolve, reject) => {
        new FBXLoader().load(url, resolve, undefined, reject);
    });
    return cacheFBX[url];
}

function TiGuy3D({ animationFile }) {
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
                mixer.clipAction(fbx.animations[0]).play();
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

function SceneTiGuy3D({ animationFile }) {
    return React.createElement(ThreeCanvas, {
            width: 1080,
            height: 1920,
            style: { position: 'absolute', top: 0, left: 0 }
        },
        React.createElement('ambientLight', { intensity: 0.8 }),
        React.createElement('directionalLight', { position: [2, 4, 3], intensity: 1.1 }),
        React.createElement('directionalLight', { position: [-2, 2, -3], intensity: 0.4 }),
        React.createElement(TiGuy3D, { animationFile })
    );
}

module.exports = { SceneTiGuy3D };
