import type { JsonSchema } from '../config/json-schema.ts';
import type { Module, Naming } from '../naming/modules.ts';
import type { FolderEntry } from '../paths/tree.ts';

export type Severity = 'error' | 'off' | 'warn';

/**
 * A rule looks at one folder at a time and reports what it finds. Built-in rules and plugin rules
 * have exactly this shape; nothing about the built-in ones is special.
 */
export interface Rule<Options extends object = object> {
    readonly meta: RuleMeta<Options>;
    check(folder: FolderView, context: RuleContext<Options>): void;
}

export interface RuleMeta<Options extends object> {
    /** One sentence, shown by `crowded-folders rules` and in the published schema. */
    readonly description: string;
    /** Where the rule is documented. */
    readonly url?: string;
    /** Every option, with its value when the configuration does not set it. */
    readonly defaultOptions: Options;
    /** The options, as JSON Schema: checked when the configuration loads, and offered by editors. */
    readonly options?: JsonSchema;
}

/** A folder, ready for a rule: its files, its subfolders and its modules. */
export interface FolderView extends FolderEntry {
    /** The files grouped into modules with the naming in effect for this folder. */
    readonly modules: readonly Module[];
    /** The naming in effect for this folder, after presets and overrides. */
    readonly naming: Naming;
}

export interface RuleContext<Options extends object> {
    /** The options in effect for this folder: the defaults, then the configuration, then overrides. */
    readonly options: Options;
    readonly report: (problem: Problem) => void;
}

export interface Problem {
    /** What is wrong and what to do about it, in one or two sentences. */
    readonly message: string;
    /**
     * Tells apart two problems of the same rule in the same folder — the prefix, for `prefix-groups`.
     * It is part of what a suppression remembers, so it must not change between runs.
     */
    readonly key?: string;
    /** The number that broke the limit. A suppression lets it stay, or go down, but not go up. */
    readonly measured?: number;
    readonly limit?: number;
    /** File names in the folder the problem is about, for locations in SARIF and annotations. */
    readonly files?: readonly string[];
    /** Where things could go instead. Never applied: moving files breaks imports, and that is the user's call. */
    readonly moves?: readonly Move[];
}

export interface Move {
    /** Paths relative to the root. */
    readonly from: string;
    readonly to: string;
}

/** Writes a rule with its options typed from `defaultOptions`. */
export function defineRule<Options extends object>(rule: Rule<Options>): Rule<Options> {
    return rule;
}

/** Shows a list of names, cut after `max` with how many more there are. */
export function listNames(names: readonly string[], max = 5): string {
    return names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}
