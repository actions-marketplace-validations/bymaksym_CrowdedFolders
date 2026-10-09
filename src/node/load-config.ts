import { dirname, resolve } from 'node:path';

import { isObject } from '../core/config/json-schema.ts';
import { mergeLayer } from '../core/config/merge.ts';
import { type Config, EMPTY_CONFIG, type Plugin, type Preset, type ResolvedConfig } from '../core/config/types.ts';
import { type ConfigProblem, formatProblems, validateConfig } from '../core/config/validate.ts';
import { BUILT_IN_PRESETS } from '../core/presets/index.ts';
import { BUILT_IN_RULES } from '../core/rules/index.ts';
import type { Rule } from '../core/rules/rule.ts';
import { readConfigFile } from './config-file.ts';
import { importDefault, resolveSpecifier } from './modules.ts';

/** A configuration that cannot be used, with every problem found in it. */
export class ConfigError extends Error {
    readonly origin: string;
    readonly problems: readonly ConfigProblem[];

    constructor(origin: string, problems: readonly ConfigProblem[]) {
        super(
            `${origin} has ${problems.length === 1 ? 'a problem' : `${problems.length} problems`}:\n${formatProblems(problems)}`,
        );
        this.name = 'ConfigError';
        this.origin = origin;
        this.problems = problems;
    }
}

export interface LoadedConfig {
    readonly config: ResolvedConfig;
    /** Built-in rules and the rules of every plugin, by the name a configuration uses. */
    readonly rules: Readonly<Record<string, Rule>>;
    /** Built-in presets and the presets of every plugin. */
    readonly presets: Readonly<Record<string, Preset>>;
    readonly plugins: readonly Plugin[];
}

const NAMESPACE = /^[a-z\d][a-z\d-]*$/u;

/**
 * Applies a configuration and everything it extends, in order, and loads its plugins.
 *
 * `extends` entries are applied depth first, each at most once: `["react", "strict"]` applies
 * `recommended` (which both extend) once, then `react`, then `strict`. A cycle is an error.
 */
export async function loadConfig(
    raw: unknown,
    origin: string,
    dir: string,
    extraRules: Readonly<Record<string, Rule>> = {},
): Promise<LoadedConfig> {
    const loader = new Loader(extraRules);
    await loader.applyLayer(raw, origin, dir, true, []);
    return { config: loader.state, rules: loader.rules, presets: loader.presets, plugins: loader.plugins };
}

/** Reads and applies a configuration file. */
export async function loadConfigFile(
    path: string,
    extraRules: Readonly<Record<string, Rule>> = {},
): Promise<LoadedConfig> {
    return loadConfig(await readConfigFile(path), path, dirname(path), extraRules);
}

class Loader {
    state: ResolvedConfig = EMPTY_CONFIG;
    rules: Record<string, Rule>;
    presets: Record<string, Preset> = { ...BUILT_IN_PRESETS };
    plugins: Plugin[] = [];
    private readonly applied = new Set<string>();
    private readonly pluginPaths = new Map<string, string>();

    /** Extra rules, as `lint({ rules })` passes them: known before the configuration is checked. */
    constructor(extraRules: Readonly<Record<string, Rule>>) {
        this.rules = { ...BUILT_IN_RULES, ...extraRules };
    }

    async applyLayer(raw: unknown, origin: string, dir: string, own: boolean, chain: readonly string[]): Promise<void> {
        if (!isObject(raw)) {
            throw new ConfigError(origin, [
                {
                    at: '(the configuration)',
                    message: `must be an object, not ${raw === undefined ? 'empty' : typeof raw}`,
                },
            ]);
        }
        const plugins = raw['plugins'];
        if (Array.isArray(plugins)) {
            for (const specifier of plugins) {
                if (typeof specifier === 'string') {
                    await this.loadPlugin(specifier, dir, origin);
                }
            }
        }
        const problems = validateConfig(raw, this.rules, Object.keys(BUILT_IN_PRESETS));
        if (problems.length > 0) {
            throw new ConfigError(origin, problems);
        }
        const config = raw as Config;
        for (const entry of config.extends ?? []) {
            await this.applyExtends(entry, dir, origin, [...chain, origin]);
        }
        this.state = mergeLayer(this.state, config, origin, own);
    }

    private async applyExtends(entry: string, dir: string, origin: string, chain: readonly string[]): Promise<void> {
        const preset = this.presets[entry];
        if (preset) {
            if (!this.applied.has(entry)) {
                this.applied.add(entry);
                await this.applyLayer(preset.config, `preset "${entry}"`, dir, false, chain);
            }
            return;
        }
        if (/^[a-z\d-]+\/[^/]+$/u.test(entry) && !entry.startsWith('.')) {
            const namespace = entry.slice(0, entry.indexOf('/'));
            if (this.plugins.some(plugin => plugin.meta.namespace === namespace)) {
                throw new ConfigError(origin, [
                    { at: 'extends', message: `"${entry}": the plugin "${namespace}" has no such preset` },
                ]);
            }
        }
        let path: string;
        try {
            path = resolveSpecifier(entry, dir);
        } catch (error) {
            const known = Object.keys(this.presets).join(', ');
            throw new ConfigError(origin, [
                {
                    at: 'extends',
                    message: `"${entry}" is not a preset (known: ${known}) and cannot be loaded: ${(error as Error).message}`,
                },
            ]);
        }
        if (chain.includes(path)) {
            throw new ConfigError(origin, [
                { at: 'extends', message: `"${entry}" extends itself through ${[...chain, path].join(' → ')}` },
            ]);
        }
        if (this.applied.has(path)) {
            return;
        }
        this.applied.add(path);
        await this.applyLayer(await readConfigFile(path), path, dirname(path), false, chain);
    }

    private async loadPlugin(specifier: string, dir: string, origin: string): Promise<void> {
        let path: string;
        let value: unknown;
        try {
            path = resolveSpecifier(specifier, dir);
            value = await importDefault(path);
        } catch (error) {
            throw new ConfigError(origin, [
                { at: 'plugins', message: `"${specifier}" cannot be loaded: ${(error as Error).message}` },
            ]);
        }
        const problem = pluginProblem(value);
        if (problem) {
            throw new ConfigError(origin, [
                { at: 'plugins', message: `"${specifier}" is not a crowded-folders plugin: ${problem}` },
            ]);
        }
        const plugin = value as Plugin;
        const namespace = plugin.meta.namespace;
        const previous = this.pluginPaths.get(namespace);
        if (previous === resolve(path)) {
            return;
        }
        if (previous !== undefined) {
            throw new ConfigError(origin, [
                { at: 'plugins', message: `two plugins use the namespace "${namespace}": ${previous} and ${path}` },
            ]);
        }
        this.pluginPaths.set(namespace, resolve(path));
        this.plugins.push(plugin);
        for (const [name, rule] of Object.entries(plugin.rules ?? {})) {
            this.rules[`${namespace}/${name}`] = rule;
        }
        for (const [name, preset] of Object.entries(plugin.presets ?? {})) {
            this.presets[`${namespace}/${name}`] = preset;
        }
    }
}

/** What is wrong with a value that should be a plugin, or `undefined` if it is one. */
export function pluginProblem(value: unknown): string | undefined {
    if (!isObject(value) || !isObject(value['meta'])) {
        return 'its default export needs a "meta" object';
    }
    const meta = value['meta'];
    if (typeof meta['namespace'] !== 'string' || !NAMESPACE.test(meta['namespace'])) {
        return 'meta.namespace must be lowercase letters, digits and "-"';
    }
    if (typeof meta['name'] !== 'string') {
        return 'meta.name must be its package name';
    }
    const rules = value['rules'];
    if (rules !== undefined) {
        if (!isObject(rules)) {
            return '"rules" must be an object';
        }
        for (const [name, rule] of Object.entries(rules)) {
            if (!isObject(rule) || typeof rule['check'] !== 'function' || !isObject(rule['meta'])) {
                return `rule "${name}" needs "meta" and a "check" function`;
            }
            if (typeof rule['meta']['description'] !== 'string' || !isObject(rule['meta']['defaultOptions'])) {
                return `rule "${name}" needs meta.description and meta.defaultOptions`;
            }
        }
    }
    const presets = value['presets'];
    if (presets !== undefined) {
        if (!isObject(presets)) {
            return '"presets" must be an object';
        }
        for (const [name, preset] of Object.entries(presets)) {
            if (
                !isObject(preset) ||
                !isObject(preset['config']) ||
                typeof preset['description'] !== 'string' ||
                !Array.isArray(preset['sources'])
            ) {
                return `preset "${name}" needs "description", "sources" and "config"`;
            }
        }
    }
    return undefined;
}
