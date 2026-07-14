const React = require('react');
const { useRef, useEffect, useState } = require('react');
const { useCurrentFrame, useVideoConfig, staticFile, continueRender, delayRender } = require('remotion');
const { ThreeCanvas } = require('@remotion/three');
const { useThree } = require('@react-three/fiber');
const THREE = require('three');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');

// Cache des FBX charges pour ne pas re-parser 26Mo a chaque frame
const cacheFBX = {};

// Animations qui representent un geste ponctuel (pas un mouvement cyclique comme marcher/danser):
// jouees en boucle rapide ca "bug" (le geste se repete plusieurs fois pendant la scene). On les
// etale plutot sur la scene entiere: le geste se joue une seule fois, au ralenti, du debut a la fin.
const ANIMATIONS_UNE_FOIS = new Set([
    'Fall_Flat.fbx',
    'Wiping_Sweat.fbx',
    'Look_Around.fbx',
    'Standing_Up.fbx',
    'Climbing_Down.fbx',
    'Kneeling_Down.fbx',
    'Carrying.fbx',
    'Taking_Item.fbx',
    'Waving_Hello.fbx'
]);

const CAMERA_FOV = 32;
const MARGE_LARGEUR = 1.3; // marge horizontale pour ne pas coller les bords
const SOL_Y = -1.05; // niveau du sol (position de base du personnage, pieds au repos)

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
    const { camera, size } = useThree();
    const [scene, setScene] = useState(null);
    const mixerRef = useRef(null);
    const actionRef = useRef(null);
    const clipDureeRef = useRef(0);
    const uneFoisRef = useRef(false);
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
                action.play();
                action.paused = true;
                actionRef.current = action;
                clipDureeRef.current = clip.duration;
                uneFoisRef.current = ANIMATIONS_UNE_FOIS.has(animationFile);

                // Calibre la camera une seule fois par scene: on echantillonne toute la duree
                // de l'animation (pas seulement la pose de depart) pour trouver un cadrage qui
                // garde Ti-Guy dans le champ du debut a la fin — meme quand il tombe, s'agenouille
                // ou etend les bras — plutot qu'un cadrage fixe calibre sur une seule pose.
                const boiteGlobale = new THREE.Box3();
                const nbEchantillons = 20;
                for (let i = 0; i <= nbEchantillons; i++) {
                    action.time = (i / nbEchantillons) * clip.duration;
                    mixer.update(0);
                    boiteGlobale.union(new THREE.Box3().setFromObject(fbx));
                }
                action.time = 0;
                mixer.update(0);

                // Cadrage ancre au sol plutot que centre sur la boite englobante: sans ca,
                // Ti-Guy "flotte" au milieu de l'ecran sans jamais toucher le bas du cadre.
                // On garde le niveau du sol (SOL_Y) fixe pres du bas de l'image, et on cadre
                // vers le haut jusqu'au point le plus haut atteint pendant l'animation.
                const centre = boiteGlobale.getCenter(new THREE.Vector3());
                const hautY = boiteGlobale.max.y;
                const etendueVerticale = Math.max(hautY - SOL_Y, 0.5);
                const margeBas = etendueVerticale * 0.10;
                const margeHaut = etendueVerticale * 0.18;
                const demiHauteurMonde = (etendueVerticale + margeBas + margeHaut) / 2;
                const centreVertical = SOL_Y - margeBas + demiHauteurMonde;

                const fovRad = (CAMERA_FOV * Math.PI) / 180;
                const ratio = size && size.width && size.height ? size.width / size.height : 1080 / 1920;
                const distancePourHauteur = demiHauteurMonde / Math.tan(fovRad / 2);
                const largeur = boiteGlobale.max.x - boiteGlobale.min.x;
                const fovHorizontalRad = 2 * Math.atan(Math.tan(fovRad / 2) * ratio);
                const distancePourLargeur = (largeur * MARGE_LARGEUR) / (2 * Math.tan(fovHorizontalRad / 2));
                const distance = Math.max(distancePourHauteur, distancePourLargeur, 1.5);

                camera.position.set(centre.x, centreVertical, centre.z + distance);
                camera.lookAt(centre.x, centreVertical, centre.z);
                camera.updateProjectionMatrix();
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

    // Calcule directement la position (en secondes) dans le clip pour cette frame video, et
    // demande au mixer d'appliquer exactement cette pose — deterministe, aucun etat cache.
    if (mixerRef.current && actionRef.current && clipDureeRef.current > 0) {
        const tSec = frame / fps;
        let clipTime;
        if (uneFoisRef.current) {
            const sceneDureeSec = durationInFrames / fps;
            const progression = sceneDureeSec > 0 ? Math.min(1, tSec / sceneDureeSec) : 1;
            clipTime = progression * clipDureeRef.current;
        } else {
            clipTime = tSec % clipDureeRef.current;
        }
        actionRef.current.time = clipTime;
        mixerRef.current.update(0);
    }

    if (!scene) return null;

    return React.createElement('primitive', { object: scene });
}

function SceneTiGuy3D({ animationFile, durationInFrames }) {
    return React.createElement(ThreeCanvas, {
            width: 1080,
            height: 1920,
            style: { position: 'absolute', top: 0, left: 0 },
            camera: { fov: CAMERA_FOV }
        },
        React.createElement('ambientLight', { intensity: 0.8 }),
        React.createElement('directionalLight', { position: [2, 4, 3], intensity: 1.1 }),
        React.createElement('directionalLight', { position: [-2, 2, -3], intensity: 0.4 }),
        React.createElement(TiGuy3D, { animationFile, durationInFrames })
    );
}

module.exports = { SceneTiGuy3D };
