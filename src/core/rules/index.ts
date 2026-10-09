import { maxFiles } from './max-files.ts';
import { maxFolders } from './max-folders.ts';
import { prefixGroups } from './prefix-groups.ts';
import { redundantPrefix } from './redundant-prefix.ts';
import type { Rule } from './rule.ts';
import { singleFileFolders } from './single-file-folders.ts';

/** The rules that come with the package, by the name a configuration uses. */
export const BUILT_IN_RULES: Readonly<Record<string, Rule>> = {
    'max-files': maxFiles,
    'prefix-groups': prefixGroups,
    'max-folders': maxFolders,
    'redundant-prefix': redundantPrefix,
    'single-file-folders': singleFileFolders,
};
