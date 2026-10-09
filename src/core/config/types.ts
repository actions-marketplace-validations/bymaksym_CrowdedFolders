import type { Rule, Severity } from '../rules/rule.ts';

/** `"error"`, or `["error", { …options }]`. */
export type RuleSetting = Severity | readonly [Severity] | readonly [Severity, Readonly<Record<string, unknown>>];

/**
 * How file names are read. Every list accumulates across `extends`, presets and overrides; an entry
 * written as `"!x"` removes `x` from what was inherited.
 */
export interface NamingConfig {
    /** Regular expressions; what each matches is removed from a stem, so that companions join their module. */
    readonly companions?: readonly string[];
    /** Lowercase words skipped at the start of a name before reading its subject (`i`, `bp`). */
    readonly ignoreLeadingWords?: readonly string[];
    /** Whether `0001_x` and `2024-01-01-x` group by their number. Default: false. */
    readonly groupNumericPrefixes?: boolean;
}

/** Settings for some folders only. Every override says why: it is a silence, and silences carry their reason. */
export interface OverrideConfig {
    /** Globs matched against folder paths (the root is `.`). */
    readonly folders: readonly string[];
    readonly reason: string;
    readonly rules?: Readonly<Record<string, RuleSetting>>;
    readonly naming?: NamingConfig;
}

/** What a configuration file holds. Every field is optional. */
export interface Config {
    readonly $schema?: string;
    /** Built-in presets (`recommended`, `react`), plugin presets (`namespace/name`), packages or files. */
    readonly extends?: readonly string[];
    /** Packages or files that export a plugin. */
    readonly plugins?: readonly string[];
    /** Globs of the files looked at. Default: everything. */
    readonly include?: readonly string[];
    /** Globs of files and folders left out, on top of `.gitignore`. */
    readonly exclude?: readonly string[];
    readonly naming?: NamingConfig;
    readonly rules?: Readonly<Record<string, RuleSetting>>;
    readonly overrides?: readonly OverrideConfig[];
    /** Where the suppressions file is, relative to the configuration. Default: `crowded-folders-suppressions.json`. */
    readonly suppressions?: string;
}

/** A link to where a preset's criterion comes from. */
export interface Source {
    readonly title: string;
    readonly url: string;
}

/** A named configuration that says where its numbers and conventions come from. */
export interface Preset {
    readonly description: string;
    /**
     * The style guides and conventions it follows. A preset without a source is an opinion; say so in `description`.
     */
    readonly sources: readonly Source[];
    readonly config: Config;
    /** When `init` (or a run without configuration) proposes it. */
    readonly detect?: Detect;
}

/** A preset applies to a repository when any of these is found in it. */
export interface Detect {
    /** Globs matched against the repository's file paths. */
    readonly files?: readonly string[];
    /** Package names in any package.json's dependencies or devDependencies. */
    readonly dependencies?: readonly string[];
}

/**
 * What a plugin package exports by default. Rules are used as `namespace/rule`, presets as
 * `namespace/preset` in `extends`.
 */
export interface Plugin {
    readonly meta: {
        /** The package name, for messages. */
        readonly name: string;
        /** Lowercase, `[a-z0-9-]`: the part before the slash in rule and preset names. */
        readonly namespace: string;
        readonly version?: string;
    };
    readonly rules?: Readonly<Record<string, Rule>>;
    readonly presets?: Readonly<Record<string, Preset>>;
}

/** A rule as it stands after every layer: severity, and the options set so far (defaults not included). */
export interface RuleState {
    readonly severity: Severity;
    readonly options: Readonly<Record<string, unknown>>;
}

/** The naming after every layer, as lists. */
export interface NamingState {
    readonly companions: readonly string[];
    readonly ignoreLeadingWords: readonly string[];
    readonly groupNumericPrefixes: boolean;
}

export interface OverrideState {
    readonly folders: readonly string[];
    readonly reason: string;
    readonly rules: Readonly<Record<string, RuleSetting>>;
    readonly naming: NamingConfig;
    /** The file or preset it was written in: stale overrides are only reported for the user's own files. */
    readonly origin: string;
    readonly own: boolean;
}

/** A configuration with every `extends` applied, ready for the engine. */
export interface ResolvedConfig {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
    readonly naming: NamingState;
    readonly rules: Readonly<Record<string, RuleState>>;
    readonly overrides: readonly OverrideState[];
    /** The presets and files applied, in order, for `print-config`. */
    readonly layers: readonly string[];
    readonly suppressions: string | undefined;
}

export const EMPTY_CONFIG: ResolvedConfig = {
    include: [],
    exclude: [],
    naming: { companions: [], ignoreLeadingWords: [], groupNumericPrefixes: false },
    rules: {},
    overrides: [],
    layers: [],
    suppressions: undefined,
};
