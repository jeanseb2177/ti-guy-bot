const React = require('react');
const { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } = require('remotion');
const { SceneTiGuy3D } = require('./TiGuy3D');

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
function Scene({ background, animation, caption, durationInFrames }) {
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

    return React.createElement(AbsoluteFill, { style: { backgroundColor: '#1B3328' } },
        // Decor avec effet Ken Burns
        React.createElement(AbsoluteFill, { style: { transform: `scale(${scale}) translateX(${translateX}px)` } },
            React.createElement(Img, { src: background, style: { width: '100%', height: '100%', objectFit: 'cover' } })
        ),
        // Ti-Guy en 3D, vraiment anime (marche, tombe, danse, rit selon l'acte)
        React.createElement(SceneTiGuy3D, { animationFile: animation, durationInFrames }),
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

function TiGuyVideo({ audioUrl, scenes, actDurationsInFrames, outroDurationInFrames, outroAvatar }) {
    let startFrame = 0;
    const sequences = scenes.map((scene, i) => {
        const duree = actDurationsInFrames[i];
        const el = React.createElement(Sequence, { key: i, from: startFrame, durationInFrames: duree },
            React.createElement(Scene, {
                background: scene.background,
                animation: scene.animation,
                caption: scene.caption,
                durationInFrames: duree
            })
        );
        startFrame += duree;
        return el;
    });

    if (outroDurationInFrames > 0) {
        sequences.push(
            React.createElement(Sequence, { key: 'outro', from: startFrame, durationInFrames: outroDurationInFrames },
                React.createElement(Outro, { avatar: outroAvatar })
            )
        );
    }

    return React.createElement(AbsoluteFill, null,
        React.createElement(Audio, { src: audioUrl }),
        ...sequences
    );
}

module.exports = { TiGuyVideo };
