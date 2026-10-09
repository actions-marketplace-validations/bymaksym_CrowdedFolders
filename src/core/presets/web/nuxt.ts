import type { Preset } from '../../config/types.ts';

export const nuxt: Preset = {
    description:
        "Vue, plus Nuxt's directories: composables/ and utils/ are auto-imported from their top level only, so a sub-folder there breaks imports unless it is re-exported, and in pages/ and server/ a file is a URL. Groups there are warnings that say so.",
    sources: [
        {
            title: 'Nuxt: composables, "Nuxt only scans files at the top level of the app/composables/ directory"',
            url: 'https://nuxt.com/docs/4.x/directory-structure/app/composables',
        },
        {
            title: 'Nuxt: utils, scanned "identical to the app/composables/ directory"',
            url: 'https://nuxt.com/docs/4.x/directory-structure/app/utils',
        },
        {
            title: 'Nuxt: server, "Files inside the ~~/server/api are automatically prefixed with /api in their route"',
            url: 'https://nuxt.com/docs/4.x/directory-structure/server',
        },
    ],
    detect: { files: ['nuxt.config.{ts,js,mjs,mts}'], dependencies: ['nuxt'] },
    config: {
        extends: ['vue'],
        overrides: [
            {
                folders: ['**/composables', '**/utils'],
                reason: 'Nuxt auto-imports only the top level of composables/ and utils/: a file moved into a sub-folder stops being imported, silently.',
                rules: {
                    'prefix-groups': [
                        'warn',
                        {
                            hint: 'Nuxt only auto-imports the top level here: a sub-folder needs an index that re-exports it, or imports.dirs in nuxt.config.',
                        },
                    ],
                },
            },
            {
                folders: ['**/pages', '**/pages/**', '**/server/api', '**/server/api/**', '**/server/routes/**'],
                reason: 'In pages/ and server/ the path of a file is its URL, so grouping files into a folder changes their routes.',
                rules: {
                    'prefix-groups': [
                        'warn',
                        { hint: 'Here a folder is part of the URL: moving a file changes its route.' },
                    ],
                },
            },
        ],
    },
};
