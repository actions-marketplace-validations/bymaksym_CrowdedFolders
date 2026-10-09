import { explainFolder } from '../../core/engine.ts';
import { groupKeyOf } from '../../core/naming/modules.ts';
import { normalisePath } from '../../core/paths/tree.ts';
import { type Args, UsageError } from '../args.ts';
import type { Io } from '../io.ts';
import { foldersFromPaths, type Session } from '../session.ts';

/**
 * Shows one folder the way the rules see it: which overrides apply and why, how each file name was
 * read (stem, words, subject, group), the rules in effect with their options, and what they report.
 * It is the answer to "why does it say that about this folder?".
 */
export function explain(args: Args, io: Io, session: Session): number {
    const [path = '.'] = foldersFromPaths(args.paths, session, io.cwd);
    const folder = normalisePath(path) ?? '.';
    const explanation = explainFolder(
        { files: session.files, config: session.loaded.config, rules: session.loaded.rules },
        folder,
    );
    if (!explanation) {
        throw new UsageError(`${folder} holds no file that is checked (it is empty, excluded, or not in git)`);
    }
    const { folder: view, rules, overrides, findings } = explanation;
    const lines: string[] = [
        `${view.path === '.' ? '. (the root)' : `${view.path}/`}  ${view.files.length} files, ${view.modules.length} modules, ${view.folders.length} subfolders`,
        '',
        'Overrides that apply',
    ];

    if (overrides.length === 0) {
        lines.push('  none');
    }
    for (const override of overrides) {
        lines.push(`  ${override.folders.join(', ')}  (${override.origin})`, `    ${override.reason}`);
    }

    lines.push(
        '',
        'Naming',
        `  companions:           ${view.naming.companions.map(pattern => `/${pattern.source}/`).join(' ') || 'none'}`,
        `  ignoreLeadingWords:   ${[...view.naming.ignoreLeadingWords].join(', ') || 'none'}`,
        `  groupNumericPrefixes: ${String(view.naming.groupNumericPrefixes)}`,
    );

    const prefixOptions = rules['prefix-groups']?.effectiveOptions;
    const words = typeof prefixOptions?.['words'] === 'number' ? prefixOptions['words'] : 1;
    lines.push('', 'Modules (stem ← files · words · group)');
    for (const module of view.modules) {
        const key = groupKeyOf(module, words, view.naming) ?? '—';
        lines.push(`  ${module.stem} ← ${module.files.join(', ')}  · ${module.words.join(' ')}  · ${key}`);
    }

    lines.push('', 'Rules in effect');
    for (const [name, state] of Object.entries(rules)) {
        if (state.severity === 'off') {
            continue;
        }
        lines.push(`  ${state.severity.padEnd(5)} ${name}  ${JSON.stringify(state.effectiveOptions)}`);
    }

    lines.push('', 'Problems');
    if (findings.length === 0) {
        lines.push('  none');
    }
    for (const finding of findings) {
        lines.push(`  ${finding.severity.padEnd(5)} ${finding.rule}  ${finding.message}`);
    }
    io.write(`${lines.join('\n')}\n`);
    return 0;
}
