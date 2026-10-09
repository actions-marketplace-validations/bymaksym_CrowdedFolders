import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseJsonc } from '../../core/config/jsonc.ts';
import { runEngine } from '../../core/engine.ts';
import { formatGithub, formatJson, formatMarkdown, formatSarif } from '../../core/report/machine.ts';
import type { Report } from '../../core/report/report.ts';
import { formatText } from '../../core/report/text.ts';
import {
    addSuppressions,
    applySuppressions,
    EMPTY_SUPPRESSIONS,
    parseSuppressions,
    pruneSuppressions,
    serialiseSuppressions,
    type SuppressionsFile,
} from '../../core/suppressions.ts';
import { type Args, UsageError } from '../args.ts';
import { type Io, wantsColor, writeFileAtomic } from '../io.ts';
import { foldersFromPaths, type Session } from '../session.ts';
import { TOOL } from '../tool.ts';

export const DEFAULT_SUPPRESSIONS = 'crowded-folders-suppressions.json';

/** The default command: checks the repository and prints the report. Returns the exit code. */
export function check(args: Args, io: Io, session: Session): number {
    const only = args.paths.length > 0 ? foldersFromPaths(args.paths, session, io.cwd) : undefined;
    const result = runEngine({
        files: session.files,
        config: session.loaded.config,
        rules: session.loaded.rules,
        ...(only && { only }),
    });

    const suppressionsPath = resolve(
        session.root,
        args.suppressionsLocation ?? session.loaded.config.suppressions ?? DEFAULT_SUPPRESSIONS,
    );
    let suppressions = readSuppressions(suppressionsPath);
    if (args.suppressAll || args.suppressRules.length > 0) {
        const unknown = args.suppressRules.filter(rule => session.loaded.rules[rule] === undefined);
        if (unknown.length > 0) {
            throw new UsageError(`--suppress-rule: ${unknown.join(', ')} is not a rule`);
        }
        suppressions = addSuppressions(
            suppressions,
            result.findings,
            args.suppressAll ? undefined : args.suppressRules,
        );
        writeFileAtomic(suppressionsPath, serialiseSuppressions(suppressions));
    }
    if (args.pruneSuppressions) {
        suppressions = pruneSuppressions(suppressions, result.findings);
        writeFileAtomic(suppressionsPath, serialiseSuppressions(suppressions));
    }
    const outcome = applySuppressions(result.findings, suppressions);
    const findings = args.quiet ? outcome.kept.filter(finding => finding.severity === 'error') : outcome.kept;

    const report: Report = {
        tool: TOOL,
        findings,
        suppressedCount: outcome.suppressed.length,
        staleSuppressions: args.passOnUnprunedSuppressions ? [] : outcome.stale,
        folderCount: result.folderCount,
        fileCount: result.fileCount,
        rules: Object.entries(session.loaded.config.rules)
            .filter(([, state]) => state.severity !== 'off')
            .map(([id]) => ({
                id,
                description: session.loaded.rules[id]?.meta.description ?? '',
                url: session.loaded.rules[id]?.meta.url,
            })),
    };

    const isColor = args.output === undefined && wantsColor(args.color, io);
    const output = render(report, args, isColor);
    if (args.output === undefined) {
        io.write(output);
    } else {
        writeFileAtomic(resolve(io.cwd, args.output), output);
    }
    if (session.detected && args.format === 'text' && args.output === undefined) {
        const presets = session.detected.map(detection => `${detection.preset} (${detection.evidence})`).join(', ');
        io.error(
            `No configuration file: used the presets detected — ${presets}. \`crowded-folders init\` writes them down.\n`,
        );
    }

    const errors = findings.filter(finding => finding.severity === 'error').length;
    if (errors > 0 || report.staleSuppressions.length > 0) {
        return 1;
    }
    const warnings = outcome.kept.filter(finding => finding.severity === 'warn').length;
    if (args.maxWarnings !== undefined && warnings > args.maxWarnings) {
        io.error(`${warnings} warnings, over --max-warnings ${args.maxWarnings}.\n`);
        return 1;
    }
    return 0;
}

function render(report: Report, args: Args, color: boolean): string {
    switch (args.format) {
        case 'json': {
            return formatJson(report);
        }
        case 'sarif': {
            return formatSarif(report);
        }
        case 'github': {
            return formatGithub(report);
        }
        case 'markdown': {
            return formatMarkdown(report);
        }
        default: {
            return formatText(report, { color, moves: args.moves });
        }
    }
}

function readSuppressions(path: string): SuppressionsFile {
    if (!existsSync(path)) {
        return EMPTY_SUPPRESSIONS;
    }
    let value: unknown;
    try {
        value = parseJsonc(readFileSync(path, 'utf8'));
    } catch (error) {
        throw new UsageError(`${path} is not valid JSON: ${(error as Error).message}`);
    }
    const parsed = parseSuppressions(value);
    if (typeof parsed === 'string') {
        throw new UsageError(`${path} ${parsed}`);
    }
    return parsed;
}
