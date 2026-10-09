import { defineRule } from './rule.ts';

export interface MaxFilesOptions {
    readonly max: number;
    readonly count: 'files' | 'modules';
    readonly dotfiles: boolean;
    readonly hint: string;
}

export const maxFiles = defineRule<MaxFilesOptions>({
    meta: {
        description: 'A folder holds at most `max` files (or modules): past that it is scrolled, not read.',
        url: 'https://github.com/bymaksym/CrowdedFolders/blob/main/docs/rules/max-files.md',
        defaultOptions: { max: 20, count: 'files', dotfiles: false, hint: '' },
        options: {
            type: 'object',
            additionalProperties: false,
            properties: {
                max: { type: 'integer', minimum: 1, description: 'How many it may hold.' },
                count: {
                    enum: ['files', 'modules'],
                    description:
                        '"files" counts every file; "modules" counts a module and its companions once (`foo.ts`, `foo.spec.ts`, `foo.html` are one).',
                },
                hint: {
                    type: 'string',
                    description: 'Added to the message: how to split in this ecosystem, or what a new folder costs.',
                },
                dotfiles: {
                    type: 'boolean',
                    description:
                        'Whether files whose name starts with a dot count. Default: false — they are mostly tool settings (.gitignore, .editorconfig) that have to live where the tool looks.',
                },
            },
        },
    },
    check(folder, { options, report }) {
        const counted = options.dotfiles ? folder.files : folder.files.filter(name => !name.startsWith('.'));
        const measured =
            options.count === 'modules'
                ? folder.modules.filter(module => module.files.some(name => options.dotfiles || !name.startsWith('.')))
                      .length
                : counted.length;
        if (measured <= options.max) {
            return;
        }
        const unit = options.count === 'modules' ? 'modules' : 'files';
        report({
            message: `${measured} ${unit}, over the limit of ${options.max}: split it into folders by what the files are about.${options.hint === '' ? '' : ` ${options.hint}`}`,
            measured,
            limit: options.max,
            files: counted,
        });
    },
});
