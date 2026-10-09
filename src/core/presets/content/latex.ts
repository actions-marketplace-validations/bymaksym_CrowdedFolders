import type { Preset } from '../../config/types.ts';

export const latex: Preset = {
    description:
        'LaTeX books and theses: chapters stay together, figures get more room (many per chapter is normal) and fig-ch3-* files grouping into figures/ch3 is a warning. Build output is left out. An opinion: LaTeX has no guide on folders.',
    sources: [
        {
            title: "LaTeX Beginner's Guide: splitting a document into files",
            url: 'https://www.oreilly.com/library/view/latex-beginners-guide/9781847199867/ch10.html',
        },
    ],
    detect: { files: ['*.tex'] },
    config: {
        extends: ['recommended'],
        exclude: ['_minted*', 'svg-inkscape', '/build', '/out'],
        rules: {
            'max-files': ['error', { max: 20, count: 'modules' }],
        },
        overrides: [
            {
                folders: ['**/figures', '**/figs', '**/images', '**/img'],
                reason: 'Many figures per chapter is normal.',
                rules: { 'max-files': ['error', { max: 40 }], 'prefix-groups': 'warn' },
            },
        ],
    },
};
