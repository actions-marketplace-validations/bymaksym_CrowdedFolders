import { plural, type Report, totalsOf } from './report.ts';

export interface TextOptions {
    readonly color: boolean;
    /** Print the suggested moves under each finding. */
    readonly moves: boolean;
}

const CODES = {
    bold: [1, 22],
    dim: [2, 22],
    red: [31, 39],
    yellow: [33, 39],
    green: [32, 39],
    cyan: [36, 39],
} as const;

type Style = keyof typeof CODES;

/** The report for a person at a terminal: grouped by folder, the summary last. */
export function formatText(report: Report, options: TextOptions): string {
    const paint = (style: Style, text: string): string =>
        options.color ? `\u{1B}[${CODES[style][0]}m${text}\u{1B}[${CODES[style][1]}m` : text;
    const lines: string[] = [];
    const ruleWidth = Math.max(0, ...report.findings.map(finding => finding.rule.length));

    let folder: string | undefined;
    for (const finding of report.findings) {
        if (finding.folder !== folder) {
            if (folder !== undefined) {
                lines.push('');
            }
            folder = finding.folder;
            lines.push(paint('bold', folder === '.' ? '. (the root)' : `${folder}/`));
        }
        const mark = finding.severity === 'error' ? paint('red', '✖ error') : paint('yellow', '⚠ warn ');
        lines.push(`  ${mark}  ${paint('dim', finding.rule.padEnd(ruleWidth))}  ${finding.message}`);
        if (options.moves && finding.moves.length > 0) {
            for (const move of finding.moves) {
                lines.push(`           ${paint('dim', `git mv ${quote(move.from)} ${quote(move.to)}`)}`);
            }
        }
    }

    if (report.staleSuppressions.length > 0) {
        if (lines.length > 0) {
            lines.push('');
        }
        lines.push(paint('bold', 'Suppressions nothing needs any more'));
        for (const stale of report.staleSuppressions) {
            const now = stale.measured === undefined ? 'fixed' : `now ${stale.measured}`;
            lines.push(`  ${paint('red', '✖')} ${stale.folder}  ${stale.id}  (suppressed at ${stale.count}, ${now})`);
        }
        lines.push(`  Run with ${paint('cyan', '--prune-suppressions')} to lower them: the file only ever shrinks.`);
    }

    const totals = totalsOf(report.findings);
    const checked = `${plural(report.folderCount, 'folder')} and ${plural(report.fileCount, 'file')} checked`;
    const suppressed = report.suppressedCount > 0 ? `; ${plural(report.suppressedCount, 'problem')} suppressed` : '';
    if (lines.length > 0) {
        lines.push('');
    }
    if (totals.errors + totals.warnings === 0) {
        lines.push(`${paint('green', '✔')} No crowded folders (${checked}${suppressed}).`);
    } else {
        const counts = `${plural(totals.errors, 'error')}, ${plural(totals.warnings, 'warning')} in ${plural(totals.folders, 'folder')}`;
        const mark = totals.errors > 0 ? paint('red', '✖') : paint('yellow', '⚠');
        lines.push(`${mark} ${counts} (${checked}${suppressed}).`);
        if (!options.moves && report.findings.some(finding => finding.moves.length > 0)) {
            lines.push(
                paint(
                    'dim',
                    '  --moves prints where each file could go; `crowded-folders explain <folder>` shows how a folder was read.',
                ),
            );
        }
    }
    return `${lines.join('\n')}\n`;
}

function quote(path: string): string {
    return /^[\w./@+-]+$/u.test(path) ? path : `'${path.replaceAll("'", String.raw`'\''`)}'`;
}
