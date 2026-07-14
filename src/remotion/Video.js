const React = require('react');
const { AbsoluteFill, Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig } = require('remotion');
const { TransitionSeries, linearTiming } = require('@remotion/transitions');
const { fade } = require('@remotion/transitions/fade');
const { SceneTiGuy3D } = require('./TiGuy3D');
const { TRANSITION_FRAMES } = require('./timing');

// Decoupe le texte de la scene en courtes lignes (comme des sous-titres qui defilent
// au rythme de la narration, plutot qu'un seul gros bloc affiche en continu).
function decouperEnLignes(texte, motsParLigne = 5) {
    const propre = (texte || '').trim();
    if (!propre) return [''];
    const mots = propre.split(/\s+/);
    const lignes = [];
    for (let i = 0; i < mots.length; i += motsParLigne) {
        lignes.push(mots.slice(i, i + motsParLigne).join(' '));
    }
    return lignes.length > 0 ? lignes : [propre];
}

// Une "scene" = un acte du mini-film (obstacle / astuce / victoire)
function Scene({ background, animation, caption, durationInFrames, environment }) {
    const frame = useCurrentFrame();

    // Effet Ken Burns: zoom + leger pan sur le decor pendant toute la duree de la scene
    const scale = interpolate(frame, [0, durationInFrames], [1, 1.18], { extrapolateRight: 'clamp' });
    const translateX = interpolate(frame, [0, durationInFrames], [0, -25], { extrapolateRight: 'clamp' });

    // Le sous-titre defile ligne par ligne, reparti sur toute la duree de la scene,
    // pour suivre le rythme de la narration au lieu d'un seul bloc fixe.
    const lignes = decouperEnLignes(caption);
    const dureeParLigne = durationInFrames / lignes.length;
    const indexLigne = Math.min(lignes.length - 1, Math.floor(frame / dureeParLigne));
    const frameLocale = frame - indexLigne * dureeParLigne;
    const fondu = Math.max(1, Math.min(6, dureeParLigne / 4));
    const ligneOpacity = interpolate(
        frameLocale,
        [0, fondu, dureeParLigne - fondu, dureeParLigne],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return React.createElement(AbsoluteFill, { style: { backgroundColor: '#1B3328', filter: 'saturate(1.12) contrast(1.06)' } },
        // Decor: soit un fond 2D avec effet Ken Burns (comme avant), soit un vrai decor 3D
        // (foret, montagne...) rendu dans la meme scene Three.js que Ti-Guy pour un effet
        // de parallaxe pendant que la camera avance, au lieu d'une image plate figee.
        !environment && React.createElement(AbsoluteFill, { style: { transform: `scale(${scale}) translateX(${translateX}px)` } },
            React.createElement(Img, { src: background, style: { width: '100%', height: '100%', objectFit: 'cover' } })
        ),
        // Ti-Guy en 3D, vraiment anime (marche, tombe, danse, rit selon l'acte), avec le decor 3D si fourni
        React.createElement(SceneTiGuy3D, { animationFile: animation, durationInFrames, environmentFile: environment }),
        // Vignette + leger etalonnage: assombrit les bords et sature un peu l'image
        // pour un rendu plus "film d'animation" que "capture plate".
        React.createElement(AbsoluteFill, {
            style: {
                pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.5) 100%)'
            }
        }),
        // Sous-titre: texte blanc simple, sans encart, qui suit la narration ligne par ligne
        React.createElement(AbsoluteFill, { style: { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 140 } },
            React.createElement('div', {
                style: {
                    opacity: ligneOpacity,
                    color: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 800,
                    fontSize: 54,
                    lineHeight: 1.3,
                    maxWidth: '90%',
                    textAlign: 'center',
                    textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7)'
                }
            }, lignes[indexLigne])
        )
    );
}

// Carton de fin: bouton CTA incruste qui pousse vers moncampdebase.com
// (purement visuel — le mp4 n'est pas cliquable, mais ca renforce l'appel a l'action
// sur TikTok/Instagram ou le lien est en bio).
function Outro({ avatar }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entree = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 20 });
    const pulsation = 1 + Math.sin(frame / 9) * 0.035;

    return React.createElement(AbsoluteFill, { style: { backgroundColor: '#1B3328' } },
        React.createElement(AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center' } },
            React.createElement(Img, {
                src: avatar,
                style: {
                    height: '50%',
                    objectFit: 'contain',
                    transform: `translateY(${-40 + (1 - entree) * 60}px) scale(${entree})`,
                    marginBottom: 60
                }
            }),
            React.createElement('div', {
                style: {
                    opacity: entree,
                    transform: `scale(${entree * pulsation})`,
                    background: '#D9662C',
                    color: '#EDE6D6',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 800,
                    fontSize: 52,
                    padding: '28px 56px',
                    borderRadius: 60,
                    border: '4px solid #EDE6D6',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
                }
            }, 'moncampdebase.com')
        )
    );
}

function transition(key) {
    return React.createElement(TransitionSeries.Transition, {
        key,
        timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }),
        presentation: fade()
    });
}

// Fondu enchaine entre chaque acte (et vers le carton de fin) plutot que des coupes
// brutes, pour un rendu plus fluide/cinema.
function TiGuyVideo({ audioUrl, scenes, actDurationsInFrames, outroDurationInFrames, outroAvatar }) {
    const elements = [];

    scenes.forEach((scene, i) => {
        if (i > 0) elements.push(transition(`t${i}`));
        elements.push(
            React.createElement(TransitionSeries.Sequence, { key: i, durationInFrames: actDurationsInFrames[i] },
                React.createElement(Scene, {
                    background: scene.background,
                    animation: scene.animation,
                    caption: scene.caption,
                    durationInFrames: actDurationsInFrames[i],
                    environment: scene.environment
                })
            )
        );
    });

    if (outroDurationInFrames > 0) {
        elements.push(transition('tOutro'));
        elements.push(
            React.createElement(TransitionSeries.Sequence, { key: 'outro', durationInFrames: outroDurationInFrames },
                React.createElement(Outro, { avatar: outroAvatar })
            )
        );
    }

    return React.createElement(AbsoluteFill, null,
        React.createElement(Audio, { src: audioUrl }),
        React.createElement(TransitionSeries, null, ...elements)
    );
}

module.exports = { TiGuyVideo };
