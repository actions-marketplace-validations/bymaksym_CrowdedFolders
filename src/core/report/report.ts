import type { Finding } from '../engine.ts';
import type { StaleSuppression } from '../suppressions.ts';

/** Everything an output format needs about one run. */
export interface Report {
    readonly tool: { readonly name: string; readonly version: string; readonly url: string };
    readonly findings: readonly Finding[];
    readonly suppressedCount: number;
    readonly staleSuppressions: readonly StaleSuppression[];
    readonly folderCount: number;
    readonly fileCount: number;
    /** Rules that were on, with their documentation, for formats that list rules (SARIF). */
    readonly rules: readonly { readonly id: string; readonly description: string; readonly url: string | undefined }[];
}

export interface Totals {
    readonly errors: number;
    readonly warnings: number;
    readonly folders: number;
}

export function totalsOf(findings: readonly Finding[]): Totals {
    return {
        errors: findings.filter(finding => finding.severity === 'error').length,
        warnings: findings.filter(finding => finding.severity === 'warn').length,
        folders: new Set(findings.map(finding => finding.folder)).size,
    };
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? singular : pluralForm}`;
}

/** The file a finding points at in formats that need one file: the first of its files, else the folder. */
export function anchorOf(finding: Finding): string {
    return finding.files[0] ?? finding.folder;
}
