import { explainFolder } from '../../core/engine.ts';
import { BUILT_IN_PRESETS } from '../../core/presets/index.ts';
import { BUILT_IN_RULES } from '../../core/rules/index.ts';
import type { Args } from '../args.ts';
import type { Io } from '../io.ts';
import { foldersFromPaths, type Session } from '../session.ts';

/** `crowded-folders presets`: every built-in preset, what it does and where its criterion comes from. */
export function listPresets(io: Io): number {
    const lines: string[] = [];
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
        lines.push(name, `  ${preset.description}`);
        for (const source of preset.sources) {
            lines.push(`  · ${source.title}: ${source.url}`);
        }
        lines.push('');
    }
    lines.push('Use them in "extends"; later ones win. Plugins add more, as "namespace/preset".');
    io.write(`${lines.join('\n')}\n`);
    return 0;
}

/** `crowded-folders rules`: every built-in rule with its options and their defaults. */
export function listRules(io: Io): number {
    const lines: string[] = [];
    for (const [name, rule] of Object.entries(BUILT_IN_RULES)) {
        lines.push(
            name,
            `  ${rule.meta.description}`,
            `  options (defaults): ${JSON.stringify(rule.meta.defaultOptions)}`,
        );
        if (rule.meta.url) {
            lines.push(`  ${rule.meta.url}`);
        }
        lines.push('');
    }
    io.write(`${lines.join('\n')}\n`);
    return 0;
}

/** `crowded-folders print-config [folder]`: the configuration after every preset and override, as JSON. */
export function printConfig(args: Args, io: Io, session: Session): number {
    const { config } = session.loaded;
    if (args.paths.length === 0) {
        io.write(
            `${JSON.stringify({ configFile: session.configPath ?? null, root: session.root, ...config }, undefined, 2)}\n`,
        );
        return 0;
    }
    const [folder = '.'] = foldersFromPaths(args.paths, session, io.cwd);
    const explanation = explainFolder({ files: session.files, config, rules: session.loaded.rules }, folder);
    const rules = Object.fromEntries(
        Object.entries(explanation?.rules ?? {}).map(([name, state]) => [
            name,
            [state.severity, state.effectiveOptions],
        ]),
    );
    const naming = explanation
        ? {
              companions: explanation.folder.naming.companions.map(pattern => pattern.source),
              ignoreLeadingWords: [...explanation.folder.naming.ignoreLeadingWords],
              groupNumericPrefixes: explanation.folder.naming.groupNumericPrefixes,
          }
        : config.naming;
    io.write(`${JSON.stringify({ folder, naming, rules, overrides: explanation?.overrides ?? [] }, undefined, 2)}\n`);
    return 0;
}
