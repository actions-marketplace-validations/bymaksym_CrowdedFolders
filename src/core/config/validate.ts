import { globProblem } from '../paths/glob.ts';
import type { Rule } from '../rules/rule.ts';
import { isObject, validate } from './json-schema.ts';
import { configSchema } from './schema.ts';
import type { Config, NamingConfig, RuleSetting } from './types.ts';

export interface ConfigProblem {
    readonly at: string;
    readonly message: string;
}

/**
 * Checks a configuration as it was written, before anything is merged: the shape against the
 * published schema, then what a schema cannot say — that the regular expressions compile, that the
 * globs are globs, and that every rule exists.
 *
 * `rules` must already include the plugins' rules; a rule the configuration names that no one
 * defines is an error, not a silence.
 */
export function validateConfig(
    value: unknown,
    rules: Readonly<Record<string, Rule>>,
    presets: readonly string[],
): ConfigProblem[] {
    const problems: ConfigProblem[] = validate(value, configSchema(rules, presets));
    if (problems.length > 0 || !isObject(value)) {
        return problems;
    }
    const config = value as Config;
    checkGlobs(config.include, 'include', problems);
    checkGlobs(config.exclude, 'exclude', problems);
    checkNaming(config.naming, 'naming', problems);
    checkRules(config.rules, 'rules', rules, problems);
    for (const [index, override] of (config.overrides ?? []).entries()) {
        const at = `overrides[${index}]`;
        checkGlobs(override.folders, `${at}.folders`, problems);
        checkNaming(override.naming, `${at}.naming`, problems);
        checkRules(override.rules, `${at}.rules`, rules, problems);
    }
    return problems;
}

function checkGlobs(globs: readonly string[] | undefined, at: string, problems: ConfigProblem[]): void {
    for (const [index, glob] of (globs ?? []).entries()) {
        const problem = globProblem(glob.startsWith('!') ? glob.slice(1) : glob);
        if (problem) {
            problems.push({ at: `${at}[${index}]`, message: `"${glob}" ${problem}` });
        }
    }
}

function checkNaming(naming: NamingConfig | undefined, at: string, problems: ConfigProblem[]): void {
    for (const [index, pattern] of (naming?.companions ?? []).entries()) {
        if (pattern.startsWith('!')) {
            continue;
        }
        try {
            new RegExp(pattern, 'u');
        } catch (error) {
            problems.push({
                at: `${at}.companions[${index}]`,
                message: `"${pattern}" is not a regular expression: ${(error as Error).message}`,
            });
        }
    }
    for (const [index, word] of (naming?.ignoreLeadingWords ?? []).entries()) {
        if (/[^\p{L}\p{N}!]/u.test(word)) {
            problems.push({
                at: `${at}.ignoreLeadingWords[${index}]`,
                message: `"${word}" is not one word: names are split at "-", "_", "." and case changes`,
            });
        }
    }
}

function checkRules(
    settings: Readonly<Record<string, RuleSetting>> | undefined,
    at: string,
    rules: Readonly<Record<string, Rule>>,
    problems: ConfigProblem[],
): void {
    for (const [name, setting] of Object.entries(settings ?? {})) {
        const where = `${at}[${JSON.stringify(name)}]`;
        const rule = rules[name];
        if (!rule) {
            const known = Object.keys(rules);
            const hint = name.includes('/')
                ? `no plugin in "plugins" defines it (known: ${known.join(', ')})`
                : `known rules: ${known.filter(rule => !rule.includes('/')).join(', ')}`;
            problems.push({ at: where, message: `is not a rule; ${hint}` });
            continue;
        }
        if (typeof setting !== 'string' && setting[1] !== undefined && rule.meta.options) {
            problems.push(...validate(setting[1], rule.meta.options, `${where}[1]`));
        }
    }
}

export function formatProblems(problems: readonly ConfigProblem[]): string {
    return problems.map(problem => `  ${problem.at}: ${problem.message}`).join('\n');
}
