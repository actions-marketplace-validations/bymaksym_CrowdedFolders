import type { Preset } from '../../config/types.ts';

export const angular: Preset = {
    description:
        "Angular's own guide: folders by feature, a component's files together, and sub-folders once a folder of the app's src/ passes about ten — the old style guide said seven, and ten when it explained why. Counts a component and its template, styles and spec once. Scripts and tooling outside src/ keep recommended's limit.",
    sources: [
        { title: 'Angular style guide: project structure', url: 'https://angular.dev/style-guide' },
        {
            title: 'Former Angular style guide, 04-04 "Flat": sub-folders at seven or more files',
            url: 'https://raw.githubusercontent.com/angular/angular/17.3.x/aio/content/guide/styleguide.md',
        },
    ],
    detect: { files: ['angular.json'], dependencies: ['@angular/core'] },
    config: {
        extends: ['recommended'],
        exclude: ['.angular', 'src/environments'],
        overrides: [
            {
                // Scripts and tooling next to the app are not the app: the guide is about src/.
                folders: ['**/src', '**/src/**'],
                reason: 'The style guide is about the application code, which Angular puts in src/: "All of your Angular UI code (TypeScript, HTML, and styles) should live inside a directory named src".',
                rules: {
                    'max-files': [
                        'error',
                        {
                            max: 10,
                            count: 'modules',
                            hint: 'Angular asks for folders by feature, not by type (no components/ or services/).',
                        },
                    ],
                },
            },
        ],
    },
};
