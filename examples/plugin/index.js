// @ts-check
// An example crowded-folders plugin. A plugin is a module whose default export has `meta`, and
// optionally `rules` and `presets`. Its rules are named `namespace/rule` in a configuration, and its
// presets `namespace/preset` in "extends".

/** @import { Plugin, Rule } from 'crowded-folders' */

/**
 * Folders whose name says nothing about what is inside. Angular's style guide ("Avoid overly
 * generic file names like helpers.ts, utils.ts, or common.ts") and Google's Go guide ("Naming a
 * package just util, helper, common or similar is usually a poor choice") say the same thing.
 *
 * @type {Rule<{ names: string[] }>}
 */
const genericNames = {
    meta: {
        description: 'Folders are not named after nothing in particular: utils, helpers, common, misc.',
        url: 'https://github.com/bymaksym/CrowdedFolders/tree/main/examples/plugin',
        defaultOptions: { names: ['utils', 'util', 'helpers', 'helper', 'common', 'misc', 'stuff'] },
        options: {
            type: 'object',
            additionalProperties: false,
            properties: {
                names: {
                    type: 'array',
                    items: { type: 'string', minLength: 1 },
                    description: 'Folder names to report, lowercase.',
                },
            },
        },
    },
    check(folder, { options, report }) {
        if (!options.names.includes(folder.name.toLowerCase())) {
            return;
        }
        report({
            message: `"${folder.name}" says nothing about what its ${folder.files.length} files do: name the folder after what they are for.`,
            measured: 1,
            files: folder.files,
        });
    },
};

/** @type {Plugin} */
const plugin = {
    meta: { name: 'crowded-folders-plugin-example', namespace: 'example', version: '0.0.0' },
    rules: { 'generic-names': genericNames },
    presets: {
        recommended: {
            description: 'Turns on example/generic-names.',
            sources: [{ title: 'Angular style guide: avoid generic names', url: 'https://angular.dev/style-guide' }],
            config: { rules: { 'example/generic-names': 'warn' } },
        },
    },
};

export default plugin;
