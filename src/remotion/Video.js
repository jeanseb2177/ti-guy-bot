const React = require('react');
const { AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame } = require('remotion');

// Une "scene" = un acte du mini-film (obstacle / astuce / victoire)
function Scene({ background, avatar, caption, durationInFrames }) {
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
        // Ti-Guy detoure, pose au premier plan
        React.createElement(AbsoluteFill, { style: { justifyContent: 'flex-end', alignItems: 'center' } },
            React.createElement(Img, { src: avatar, style: { height: '80%', objectFit: 'contain' } })
        ),
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

function TiGuyVideo({ audioUrl, scenes, actDurationsInFrames }) {
    let startFrame = 0;
    const sequences = scenes.map((scene, i) => {
        const duree = actDurationsInFrames[i];
        const el = React.createElement(Sequence, { key: i, from: startFrame, durationInFrames: duree },
            React.createElement(Scene, {
                background: scene.background,
                avatar: scene.avatar,
                caption: scene.caption,
                durationInFrames: duree
            })
        );
        startFrame += duree;
        return el;
    });

    return React.createElement(AbsoluteFill, null,
        React.createElement(Audio, { src: audioUrl }),
        ...sequences
    );
}

module.exports = { TiGuyVideo };
