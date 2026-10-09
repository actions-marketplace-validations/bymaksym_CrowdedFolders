import { defineRule, listNames } from './rule.ts';

export interface MaxFoldersOptions {
    readonly max: number;
}

export const maxFolders = defineRule<MaxFoldersOptions>({
    meta: {
        description: 'A folder holds at most `max` subfolders: a long list of folders is a drawer too.',
        url: 'https://github.com/bymaksym/CrowdedFolders/blob/main/docs/rules/max-folders.md',
        defaultOptions: { max: 30 },
        options: {
            type: 'object',
            additionalProperties: false,
            properties: {
                max: { type: 'integer', minimum: 1, description: 'How many subfolders it may hold.' },
            },
        },
    },
    check(folder, { options, report }) {
        const measured = folder.folders.length;
        if (measured <= options.max) {
            return;
        }
        report({
            message: `${measured} subfolders, over the limit of ${options.max} (${listNames(folder.folders)}): group them by what they are about.`,
            measured,
            limit: options.max,
        });
    },
});
