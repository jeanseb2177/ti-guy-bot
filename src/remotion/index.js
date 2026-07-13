const React = require('react');
const { Composition, registerRoot } = require('remotion');
const { TiGuyVideo } = require('./Video');

function RemotionRoot() {
    return React.createElement(Composition, {
        id: 'TiGuyVideo',
        component: TiGuyVideo,
        durationInFrames: 1200, // valeur par defaut, recalculee dynamiquement au rendu
        fps: 30,
        width: 1080,
        height: 1920,
        defaultProps: {
            audioUrl: '',
            scenes: [
                { background: '', animation: 'Fall_Flat.fbx', caption: '' },
                { background: '', animation: 'Unarmed_Walk_Forward.fbx', caption: '' },
                { background: '', animation: 'Silly_Dancing.fbx', caption: '' }
            ],
            actDurationsInFrames: [400, 400, 400],
            outroDurationInFrames: 90,
            outroAvatar: ''
        }
    });
}

registerRoot(RemotionRoot);
