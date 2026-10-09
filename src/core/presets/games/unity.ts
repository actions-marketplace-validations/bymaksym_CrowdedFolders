import type { Preset } from '../../config/types.ts';
import { MEDIA } from '../general.ts';

export const unity: Preset = {
    description:
        'Unity: every asset has a .meta next to it (Player.cs and Player.cs.meta are one), numbered series such as Model1, Model2 are one asset family, and Library, Temp, Packages and third-party plugins are left out. C# reads as in the dotnet preset.',
    sources: [
        {
            title: 'Unity manual: asset metadata (.meta files)',
            url: 'https://docs.unity3d.com/Manual/AssetMetadata.html',
        },
        { title: 'Unity manual: special folder names', url: 'https://docs.unity3d.com/Manual/SpecialFolders.html' },
        {
            title: 'Unity: best practices for organizing your project',
            url: 'https://unity.com/how-to/organizing-your-project',
        },
    ],
    detect: { files: ['ProjectSettings/ProjectVersion.txt'] },
    config: {
        extends: ['dotnet'],
        // The assets are the project here: textures, sounds and models count.
        exclude: [`!${MEDIA}`, '/Library', '/Temp', '/Logs', '/UserSettings', '/Packages', 'Assets/Plugins', '*~'],
        naming: { companions: [String.raw`_?\d+$`] },
        rules: {
            'prefix-groups': [
                'warn',
                {
                    min: 15,
                    hint: `Allar's rule 2.7, the one number game guides give: "If you find yourself having 15+ of these assets that belong together, they should be together."`,
                },
            ],
            'max-files': ['error', { max: 30, count: 'modules' }],
        },
    },
};
