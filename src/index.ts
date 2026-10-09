/**
 * The programmatic API: what a plugin, a shared configuration or a script imports.
 *
 * Everything exported here is public and versioned; anything else under `dist/` is not importable
 * (package.json `exports` closes it).
 */
import { resolve } from 'node:path';

import type { Config, Plugin, Preset } from './core/config/types.ts';
import { type EngineResult, runEngine } from './core/engine.ts';
import type { Rule } from './core/rules/rule.ts';
import { findConfig, gitRootOf, projectDirOf } from './node/config-file.ts';
import { listFiles } from './node/files.ts';
import { loadConfig, loadConfigFile } from './node/load-config.ts';

export { mergeLayer } from './core/config/merge.ts';
export { configSchema } from './core/config/schema.ts';
export type {
    Config,
    Detect,
    NamingConfig,
    OverrideConfig,
    Plugin,
    Preset,
    ResolvedConfig,
    RuleSetting,
    Source,
} from './core/config/types.ts';
export { explainFolder, type Finding, runEngine } from './core/engine.ts';
export { groupKeyOf, type Module, modulesOf, type Naming, stemOf } from './core/naming/modules.ts';
export { splitWords } from './core/naming/words.ts';
export { BUILT_IN_PRESETS } from './core/presets/index.ts';
export { BUILT_IN_RULES } from './core/rules/index.ts';
export {
    defineRule,
    type FolderView,
    type Move,
    type Problem,
    type Rule,
    type RuleContext,
    type RuleMeta,
    type Severity,
} from './core/rules/rule.ts';
export { ConfigError } from './node/load-config.ts';

/** Types a configuration file written in JavaScript: `export default defineConfig({ … })`. */
export function defineConfig(config: Config): Config {
    return config;
}

/** Types a plugin: `export default definePlugin({ meta, rules, presets })`. */
export function definePlugin(plugin: Plugin): Plugin {
    return plugin;
}

/** Types a preset, for plugins and shared configurations. */
export function definePreset(preset: Preset): Preset {
    return preset;
}

export interface LintOptions {
    /** Where to start looking for the configuration and the repository. Default: `process.cwd()`. */
    readonly cwd?: string;
    /** A configuration object, or the path of a configuration file. Default: found from `cwd` upwards. */
    readonly config?: Config | string;
    /** The folder to check. Default: the configuration's folder, else the top of the git repository, else `cwd`. */
    readonly root?: string;
    /** The files to check, relative to the root. Default: asked to git, or read from the disk. */
    readonly files?: readonly string[];
    /** Extra rules, as a plugin would add them, by full name. */
    readonly rules?: Readonly<Record<string, Rule>>;
}

export interface LintResult extends EngineResult {
    readonly root: string;
}

/** Checks a repository the way the command does, and returns the findings without printing them. */
export async function lint(options: LintOptions = {}): Promise<LintResult> {
    const cwd = resolve(options.cwd ?? process.cwd());
    let configPath: string | undefined;
    let configObject: Config | undefined;
    if (typeof options.config === 'string') {
        configPath = resolve(cwd, options.config);
    } else if (options.config) {
        configObject = options.config;
    } else {
        configPath = findConfig(cwd)?.path;
    }
    const root = resolve(cwd, options.root ?? (configPath ? projectDirOf(configPath) : (gitRootOf(cwd) ?? cwd)));
    const loaded =
        configPath === undefined
            ? await loadConfig(
                  configObject ?? { extends: ['recommended'] },
                  '(the lint() options)',
                  root,
                  options.rules,
              )
            : await loadConfigFile(configPath, options.rules);
    const files = options.files ?? listFiles(root, { git: true }).files;
    const result = runEngine({ files, config: loaded.config, rules: loaded.rules });
    return { ...result, root };
}
