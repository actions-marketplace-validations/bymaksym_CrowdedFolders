import { folderKeyOf } from '../naming/modules.ts';
import { splitWords } from '../naming/words.ts';
import { joinPath } from '../paths/tree.ts';
import { defineRule, listNames, type Move } from './rule.ts';

export interface RedundantPrefixOptions {
    readonly min: number;
}

export const redundantPrefix = defineRule<RedundantPrefixOptions>({
    meta: {
        description:
            "Modules inside a folder do not repeat the folder's name: `render/render-json.ts` says render twice; `render/json.ts` says it once. A module named exactly like its folder (`render/render.ts`) is its main file and is fine.",
        url: 'https://github.com/bymaksym/CrowdedFolders/blob/main/docs/rules/redundant-prefix.md',
        defaultOptions: { min: 2 },
        options: {
            type: 'object',
            additionalProperties: false,
            properties: {
                min: {
                    type: 'integer',
                    minimum: 1,
                    description: 'How many modules have to repeat the name before it is reported: 1 reports every one.',
                },
            },
        },
    },
    check(folder, { options, report }) {
        if (folder.path === '.') {
            return;
        }
        const prefix = splitWords(folder.name);
        const singular = folderKeyOf(folder.name).replace(/s$/u, '').split('-');
        const repeating = folder.modules.filter(
            module => startsWith(module.subject, prefix) || startsWith(module.subject, singular),
        );
        if (repeating.length < options.min) {
            return;
        }
        const spellings = [folder.name, folder.name.replace(/s$/u, '')];
        const moves: Move[] = [];
        for (const file of repeating.flatMap(module => module.files)) {
            const renamed = withoutPrefix(file, spellings);
            if (renamed !== undefined) {
                moves.push({ from: joinPath(folder.path, file), to: joinPath(folder.path, renamed) });
            }
        }
        report({
            message: `${repeating.length} modules repeat the folder's name "${folder.name}" (${listNames(repeating.map(module => module.stem))}): the folder already says it.`,
            measured: repeating.length,
            limit: options.min - 1,
            files: repeating.flatMap(module => module.files),
            moves,
        });
    },
});

/**
 * The file name without the folder's name in front, keeping its own convention: `render-json.ts` →
 * `json.ts`, `RenderJson.cs` → `Json.cs`, `render_json_test.go` → `json_test.go`. `undefined` when
 * the name does not literally start with it (an ignored leading word comes first, say).
 */
function withoutPrefix(file: string, spellings: readonly string[]): string | undefined {
    for (const spelling of spellings) {
        if (spelling === '' || !file.toLowerCase().startsWith(spelling.toLowerCase())) {
            continue;
        }
        let rest = file.slice(spelling.length);
        while (rest.startsWith('-') || rest.startsWith('_') || rest.startsWith(' ')) {
            rest = rest.slice(1);
        }
        if (rest !== '' && !rest.startsWith('.')) {
            return rest;
        }
    }
    return undefined;
}

/** Whether `words` starts with all of `prefix` and has something after it. */
function startsWith(words: readonly string[], prefix: readonly string[]): boolean {
    return prefix.length > 0 && words.length > prefix.length && prefix.every((word, index) => words[index] === word);
}
