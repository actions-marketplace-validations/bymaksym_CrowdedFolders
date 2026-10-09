import type { Preset } from '../../config/types.ts';

export const svelte: Preset = {
    description:
        'Recommended, plus SvelteKit routes: under src/routes a folder is a route, so the advice is a group folder ((name)). The + of route files (+page, +layout) is not a prefix.',
    sources: [
        { title: 'SvelteKit: project structure', url: 'https://svelte.dev/docs/kit/project-structure' },
        { title: 'SvelteKit: routing (+ files, groups)', url: 'https://svelte.dev/docs/kit/routing' },
    ],
    detect: { dependencies: ['svelte', '@sveltejs/kit'] },
    config: {
        extends: ['recommended'],
        exclude: ['.svelte-kit', 'static'],
        overrides: [
            {
                folders: ['src/routes', 'src/routes/**'],
                reason: 'Under src/routes a plain folder becomes a route.',
                rules: {
                    'prefix-groups': [
                        'error',
                        { hint: 'Under src/routes a folder is a route: use a group folder ((name)) to keep the URLs.' },
                    ],
                },
            },
        ],
    },
};
