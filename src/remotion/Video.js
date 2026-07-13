const React = require('react');
const { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } = require('remotion');
const { SceneTiGuy3D } = require('./TiGuy3D');

// Une "scene" = un acte du mini-film (obstacle / astuce / victoire)
function Scene({ background, animation, caption, durationInFrames }) {
    const frame = useCurrentFrame();

    // Effet Ken Burns: zoom + leger pan sur le decor pendant toute la duree de la scene
    const scale = interpolate(frame, [0, durationInFrames], [1, 1.18], { extrapolateRight: 'clamp' });
    const translateX = interpolate(frame, [0, durationInFrames], [0, -25], { extrapolateRight: 'clamp' });

    // Le texte du sous-titre apparait en fondu au debut de chaque scene
    const captionOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

    return React.createElement(AbsoluteFill, { style: { backgroundColor: '#1B3328' } },
        // Decor avec effet Ken Burns
        React.createElement(AbsoluteFill, { style: { transform: `scale(${scale}) translateX(${translateX}px)` } },
            React.createElement(Img, { src: background, style: { width: '100%', height: '100%', objectFit: 'cover' } })
        ),
        // Ti-Guy en 3D, vraiment anime (marche, tombe, danse, rit selon l'acte)
        React.createElement(SceneTiGuy3D, { animationFile: animation }),
        // Bandeau sous-titre en bas, style "carnet de terrain"
        React.createElement(AbsoluteFill, { style: { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 140 } },
            React.createElement('div', {
                style: {
                    opacity: captionOpacity,
                    background: 'rgba(18,36,25,0.88)',
                    color: '#EDE6D6',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 800,
                    fontSize: 46,
                    lineHeight: 1.3,
                    padding: '22px 34px',
                    borderRadius: 14,
                    maxWidth: '86%',
                    textAlign: 'center',
                    border: '3px solid #D9662C'
                }
            }, caption)
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
