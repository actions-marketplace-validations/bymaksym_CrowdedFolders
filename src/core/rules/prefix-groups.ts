import { isLanguageTag } from '../naming/languages.ts';
import { groupKeyOf, keyRestatesPath, type Module } from '../naming/modules.ts';
import { isNumericWord } from '../naming/words.ts';
import { joinPath } from '../paths/tree.ts';
import { defineRule, listNames, type Move } from './rule.ts';

export interface PrefixGroupsOptions {
    readonly min: number;
    readonly words: number;
    readonly ignore: readonly string[];
    readonly hint: string;
}

export const prefixGroups = defineRule<PrefixGroupsOptions>({
    meta: {
        description:
            'At least `min` modules whose names start with the same word belong in a folder named after it: `render-json`, `render-text`, `render-sarif`, `render-pr` are a `render/` folder that was never made.',
        url: 'https://github.com/bymaksym/CrowdedFolders/blob/main/docs/rules/prefix-groups.md',
        defaultOptions: { min: 4, words: 1, ignore: [], hint: '' },
        options: {
            type: 'object',
            additionalProperties: false,
            properties: {
                min: { type: 'integer', minimum: 2, description: 'How many modules sharing a prefix make a group.' },
                words: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 4,
                    description:
                        'How many leading words form the prefix: 1 groups `user-list` with `user-card`; 2 needs `user-list-*`.',
                },
                ignore: {
                    type: 'array',
                    items: { type: 'string', minLength: 1 },
                    uniqueItems: true,
                    description:
                        'Prefixes that are never a group, lowercase, words joined with "-": a verb shared by unrelated files, or a convention such as `use`.',
                },
                hint: {
                    type: 'string',
                    description:
                        'Added to the message: what making a folder costs in this ecosystem ("In Go a folder is a package: …").',
                },
            },
        },
    },
    check(folder, { options, report }) {
        const ignored = new Set(options.ignore.map(prefix => prefix.toLowerCase()));
        const byKey = new Map<string, Module[]>();
        for (const module of folder.modules) {
            const key = groupKeyOf(module, options.words, folder.naming);
            if (key === undefined || ignored.has(key)) {
                continue;
            }
            byKey.set(key, [...(byKey.get(key) ?? []), module]);
        }
        for (const [key, modules] of byKey) {
            // A prefix the whole folder shares is the folder's subject, not a group inside it: moving
            // everything one level down would only add a level.
            const isWholeFolder = modules.length === folder.modules.length;
            if (
                modules.length < options.min ||
                isWholeFolder ||
                keyRestatesPath(key, folder.path) ||
                areTranslations(modules, options.words) ||
                (!folder.naming.groupNumericPrefixes && isNumberedSeries(modules, options.words))
            ) {
                continue;
            }
            const target = joinPath(folder.path, key);
            const moves: Move[] = modules.flatMap(module =>
                module.files.map(file => ({ from: joinPath(folder.path, file), to: joinPath(target, file) })),
            );
            const hint = options.hint === '' ? '' : ` ${options.hint}`;
            report({
                message: `${modules.length} modules start with "${key}" (${listNames(modules.map(module => module.stem))}): they are a folder that was never made — ${target}/.${hint}`,
                key,
                measured: modules.length,
                limit: options.min - 1,
                files: modules.flatMap(module => module.files),
                moves,
            });
        }
    },
});

/**
 * Whether a group is one thing in several languages: `README-ja`, `README-ko`, `README-ru` (bat), or
 * the `strings_ar` … `strings_zh` that slang generates (localsend). What follows the prefix is a
 * language tag in every module but the untranslated one.
 */
function areTranslations(modules: readonly Module[], words: number): boolean {
    const rests = modules.map(module => module.subject.slice(words)).filter(rest => rest.length > 0);
    return rests.length >= modules.length - 1 && rests.every(rest => isLanguageTag(rest));
}

/**
 * Whether a group is a numbered series: every module is the prefix, a number and a title, as
 * `ADR-001-Use-EFCore-In-Application-Layer` (jasontaylordev/CleanArchitecture) or `RFC-0042-async-io`.
 * Such a series is kept flat and in order, like migrations; `x-1`, `x-2` without a title, or a
 * group where only `SM_1MeterSphere` has a number, are still groups.
 */
function isNumberedSeries(modules: readonly Module[], words: number): boolean {
    return modules.every(
        module =>
            isNumericWord(module.subject[words] ?? '') &&
            module.subject.length > words + 1 &&
            !isNumericWord(module.subject[words + 1] ?? ''),
    );
}
