import type { Preset } from '../../config/types.ts';
import { MEDIA } from '../general.ts';

export const godot: Preset = {
    description:
        "Godot: a scene and its script are one (player.tscn, player.gd), and so are the .import and .uid files next to an asset. Godot's guide asks to keep resources close to the scenes that use them — folders by feature. .godot and addons are left out.",
    sources: [
        {
            title: 'Godot: project organization',
            url: 'https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html',
        },
        { title: 'Godot 4.4: .uid files', url: 'https://godotengine.org/article/uid-changes-coming-to-godot-4-4/' },
    ],
    detect: { files: ['project.godot'] },
    config: {
        extends: ['recommended'],
        // The assets are the project here: textures, sounds and models count.
        exclude: [`!${MEDIA}`, '.godot', '/addons'],
        rules: {
            'prefix-groups': [
                'warn',
                {
                    min: 15,
                    hint: `Allar's rule 2.7, the one number game guides give: "If you find yourself having 15+ of these assets that belong together, they should be together."`,
                },
            ],
        },
    },
};
