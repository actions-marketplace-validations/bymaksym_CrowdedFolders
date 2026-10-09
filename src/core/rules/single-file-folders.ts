import { defineRule } from './rule.ts';

// No options; the empty object is what the rule's options are.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- a rule without options still has an options type
export interface SingleFileFoldersOptions {}

export const singleFileFolders = defineRule<SingleFileFoldersOptions>({
    meta: {
        description:
            'A folder that holds one file and no subfolders is a level of nesting with nothing to group: keep the file in its parent until it has company. The other side of `max-files`, for those who split too early.',
        url: 'https://github.com/bymaksym/CrowdedFolders/blob/main/docs/rules/single-file-folders.md',
        defaultOptions: {},
        options: { type: 'object', additionalProperties: false, properties: {} },
    },
    check(folder, { report }) {
        if (folder.path === '.' || folder.folders.length > 0 || folder.files.length !== 1) {
            return;
        }
        report({
            message: `holds only ${folder.files[0] ?? 'one file'}: a folder with nothing to group is one more level to open.`,
            measured: 1,
            limit: 0,
            files: folder.files,
        });
    },
});
