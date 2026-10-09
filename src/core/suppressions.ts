import { isObject } from './config/json-schema.ts';
import type { Finding } from './engine.ts';
import { compareText } from './naming/modules.ts';

/**
 * The problems a repository already had when it adopted the tool, so it can start failing only on
 * new ones. The same idea, file and flags as ESLint's bulk suppressions.
 *
 * Each entry remembers the number that was measured. It may stay or go down; it may not go up. A
 * suppression nothing needs any more — fixed, or lower than it remembers — fails the run until it
 * is pruned, so the file only ever shrinks: a ceiling that only comes down.
 */
export interface SuppressionsFile {
    readonly version: 1;
    /** Folder → `rule` or `rule#key` → the number measured when it was suppressed. */
    readonly suppressions: Readonly<Record<string, Readonly<Record<string, { readonly count: number }>>>>;
}

export interface StaleSuppression {
    readonly folder: string;
    readonly id: string;
    readonly count: number;
    /** What is measured today; `undefined` when the problem is gone. */
    readonly measured: number | undefined;
}

export interface SuppressionOutcome {
    readonly kept: readonly Finding[];
    readonly suppressed: readonly Finding[];
    readonly stale: readonly StaleSuppression[];
}

export const EMPTY_SUPPRESSIONS: SuppressionsFile = { version: 1, suppressions: {} };

export function suppressionId(finding: Pick<Finding, 'key' | 'rule'>): string {
    return finding.key === undefined ? finding.rule : `${finding.rule}#${finding.key}`;
}

/** Splits findings into the ones still reported and the ones a suppression covers. */
export function applySuppressions(findings: readonly Finding[], file: SuppressionsFile): SuppressionOutcome {
    const kept: Finding[] = [];
    const suppressed: Finding[] = [];
    const used = new Set<string>();
    const stale: StaleSuppression[] = [];
    for (const finding of findings) {
        const id = suppressionId(finding);
        const entry = file.suppressions[finding.folder]?.[id];
        if (!entry || finding.rule.startsWith('config/')) {
            kept.push(finding);
            continue;
        }
        used.add(`${finding.folder}\0${id}`);
        if (finding.measured > entry.count) {
            kept.push({ ...finding, message: `${finding.message} (Suppressed at ${entry.count}; it has grown.)` });
            continue;
        }
        suppressed.push(finding);
        if (finding.measured < entry.count) {
            stale.push({ folder: finding.folder, id, count: entry.count, measured: finding.measured });
        }
    }
    for (const [folder, entries] of Object.entries(file.suppressions)) {
        for (const [id, entry] of Object.entries(entries)) {
            if (!used.has(`${folder}\0${id}`)) {
                stale.push({ folder, id, count: entry.count, measured: undefined });
            }
        }
    }
    return {
        kept,
        suppressed,
        stale: stale.toSorted((a, b) => compareText(a.folder, b.folder) || compareText(a.id, b.id)),
    };
}

/**
 * Adds a suppression for every error-level finding (optionally only some rules) to `existing`, the
 * way `--suppress-all` and `--suppress-rule` do. Warnings never fail a run, so they are not kept.
 */
export function addSuppressions(
    existing: SuppressionsFile,
    findings: readonly Finding[],
    rules?: readonly string[],
): SuppressionsFile {
    const result = cloneEntries(existing);
    for (const finding of findings) {
        if (
            finding.severity !== 'error' ||
            finding.rule.startsWith('config/') ||
            (rules && !rules.includes(finding.rule))
        ) {
            continue;
        }
        const folder = (result[finding.folder] ??= {});
        const id = suppressionId(finding);
        folder[id] = { count: Math.max(folder[id]?.count ?? 0, finding.measured) };
    }
    return sortedFile(result);
}

/** Removes what nothing needs and lowers what went down: `--prune-suppressions`. */
export function pruneSuppressions(existing: SuppressionsFile, findings: readonly Finding[]): SuppressionsFile {
    const measured = new Map<string, number>();
    for (const finding of findings) {
        measured.set(`${finding.folder}\0${suppressionId(finding)}`, finding.measured);
    }
    const result: Record<string, Record<string, { count: number }>> = {};
    for (const [folder, entries] of Object.entries(existing.suppressions)) {
        for (const [id, entry] of Object.entries(entries)) {
            const now = measured.get(`${folder}\0${id}`);
            if (now !== undefined) {
                (result[folder] ??= {})[id] = { count: Math.min(entry.count, now) };
            }
        }
    }
    return sortedFile(result);
}

/** Reads a suppressions file that came from disk; the message says what is wrong with it. */
export function parseSuppressions(value: unknown): SuppressionsFile | string {
    if (!isObject(value) || value['version'] !== 1 || !isObject(value['suppressions'])) {
        return 'is not a crowded-folders suppressions file (it needs "version": 1 and "suppressions")';
    }
    const suppressions: Record<string, Record<string, { count: number }>> = {};
    for (const [folder, entries] of Object.entries(value['suppressions'])) {
        if (!isObject(entries)) {
            return `has a folder "${folder}" that is not an object`;
        }
        for (const [id, entry] of Object.entries(entries)) {
            const count = isObject(entry) ? entry['count'] : undefined;
            if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
                return `has "${folder}" → "${id}" without a whole "count"`;
            }
            (suppressions[folder] ??= {})[id] = { count };
        }
    }
    return { version: 1, suppressions };
}

export function serialiseSuppressions(file: SuppressionsFile): string {
    return `${JSON.stringify(file, undefined, 2)}\n`;
}

function cloneEntries(file: SuppressionsFile): Record<string, Record<string, { count: number }>> {
    const result: Record<string, Record<string, { count: number }>> = {};
    for (const [folder, entries] of Object.entries(file.suppressions)) {
        result[folder] = { ...entries };
    }
    return result;
}

function sortedFile(entries: Readonly<Record<string, Readonly<Record<string, { count: number }>>>>): SuppressionsFile {
    const suppressions: Record<string, Record<string, { count: number }>> = {};
    for (const folder of Object.keys(entries).toSorted(compareText)) {
        const inner = entries[folder] ?? {};
        const ids = Object.keys(inner).toSorted(compareText);
        if (ids.length === 0) {
            continue;
        }
        suppressions[folder] = {};
        for (const id of ids) {
            const entry = inner[id];
            if (entry) {
                suppressions[folder][id] = entry;
            }
        }
    }
    return { version: 1, suppressions };
}
