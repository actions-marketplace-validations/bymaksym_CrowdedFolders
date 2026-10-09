import type { Preset } from '../../config/types.ts';

export const vue: Preset = {
    description:
        "Vue's style guide asks for the opposite of prefix-groups in components/: tightly coupled children are named after their parent (TodoList, TodoListItem, TodoListItemButton) and kept flat, and sub-folders wait until about 100 components. So components/ gets no prefix groups and a high limit; Base, App and V are skipped as the prefixes of base components.",
    sources: [
        {
            title: 'Vue style guide: tightly coupled component names, base component names, order of words',
            url: 'https://vuejs.org/style-guide/rules-strongly-recommended.html',
        },
    ],
    detect: { dependencies: ['vue', 'nuxt'] },
    config: {
        extends: ['recommended'],
        exclude: ['.nuxt', '.output'],
        naming: { ignoreLeadingWords: ['base', 'app', 'v', 'the', 'use'] },
        rules: {
            'max-files': ['error', { max: 30, count: 'modules' }],
        },
        overrides: [
            {
                folders: ['**/components', '**/components/**'],
                reason: 'The Vue style guide names coupled children after their parent and keeps them flat ("This isn\'t recommended" about nesting them), and only suggests sub-folders in "very large apps (e.g. 100+ components)".',
                rules: {
                    'prefix-groups': 'off',
                    'max-files': ['error', { max: 100 }],
                },
            },
        ],
    },
};
