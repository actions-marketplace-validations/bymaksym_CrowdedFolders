import { anchorOf, type Report, totalsOf } from './report.ts';

/** The report as JSON: a stable shape for scripts. Adding a field is a minor change; renaming one is major. */
export function formatJson(report: Report): string {
    const totals = totalsOf(report.findings);
    return `${JSON.stringify(
        {
            tool: report.tool,
            summary: {
                errors: totals.errors,
                warnings: totals.warnings,
                foldersWithProblems: totals.folders,
                foldersChecked: report.folderCount,
                filesChecked: report.fileCount,
                suppressed: report.suppressedCount,
            },
            findings: report.findings.map(finding => ({
                rule: finding.rule,
                severity: finding.severity,
                folder: finding.folder,
                message: finding.message,
                key: finding.key ?? null,
                measured: finding.measured,
                limit: finding.limit ?? null,
                files: finding.files,
                moves: finding.moves,
                url: finding.url ?? null,
            })),
            staleSuppressions: report.staleSuppressions.map(stale => ({ ...stale, measured: stale.measured ?? null })),
        },
        undefined,
        2,
    )}\n`;
}

/**
 * SARIF 2.1.0, for GitHub code scanning and other viewers. A finding is about a folder; SARIF wants
 * a file, so the location is the first file the finding names and the message names the folder.
 */
export function formatSarif(report: Report): string {
    const sarif = {
        $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
        version: '2.1.0',
        runs: [
            {
                tool: {
                    driver: {
                        name: report.tool.name,
                        version: report.tool.version,
                        informationUri: report.tool.url,
                        rules: report.rules.map(rule => ({
                            id: rule.id,
                            shortDescription: { text: rule.description },
                            ...(rule.url && { helpUri: rule.url }),
                        })),
                    },
                },
                results: report.findings.map(finding => ({
                    ruleId: finding.rule,
                    level: finding.severity === 'error' ? 'error' : 'warning',
                    message: { text: `${finding.folder === '.' ? 'The root' : finding.folder}: ${finding.message}` },
                    locations: [
                        {
                            physicalLocation: {
                                artifactLocation: { uri: encodeUri(anchorOf(finding)), uriBaseId: '%SRCROOT%' },
                            },
                        },
                    ],
                    partialFingerprints: { folderRule: `${finding.folder}:${finding.rule}:${finding.key ?? ''}` },
                })),
            },
        ],
    };
    return `${JSON.stringify(sarif, undefined, 2)}\n`;
}

/** GitHub Actions workflow commands: one annotation per finding, on the first file it names. */
export function formatGithub(report: Report): string {
    const lines = report.findings.map(finding => {
        const command = finding.severity === 'error' ? 'error' : 'warning';
        const title = `crowded-folders: ${finding.rule}`;
        const where = finding.folder === '.' ? 'The root' : `${finding.folder}/`;
        return `::${command} file=${escapeProperty(anchorOf(finding))},title=${escapeProperty(title)}::${escapeData(`${where} ${finding.message}`)}`;
    });
    for (const stale of report.staleSuppressions) {
        lines.push(
            `::error title=crowded-folders: stale suppression::${escapeData(`${stale.folder} ${stale.id} is suppressed at ${stale.count} and is ${stale.measured === undefined ? 'fixed' : `now ${stale.measured}`}: run with --prune-suppressions.`)}`,
        );
    }
    return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}

/** A Markdown summary for a pull request comment or `$GITHUB_STEP_SUMMARY`. */
export function formatMarkdown(report: Report): string {
    const totals = totalsOf(report.findings);
    const lines = ['## crowded-folders', ''];
    if (report.findings.length === 0 && report.staleSuppressions.length === 0) {
        lines.push(`No crowded folders: ${report.folderCount} folders and ${report.fileCount} files checked.`);
        return `${lines.join('\n')}\n`;
    }
    lines.push(
        `**${totals.errors} error${totals.errors === 1 ? '' : 's'}, ${totals.warnings} warning${totals.warnings === 1 ? '' : 's'}** in ${totals.folders} folder${totals.folders === 1 ? '' : 's'} (${report.folderCount} checked).`,
        '',
        '| Folder | Rule | Problem |',
        '| --- | --- | --- |',
    );
    for (const finding of report.findings) {
        const rule = finding.url ? `[${finding.rule}](${finding.url})` : finding.rule;
        lines.push(`| \`${finding.folder}\` | ${rule} | ${escapeCell(finding.message)} |`);
    }
    if (report.staleSuppressions.length > 0) {
        lines.push('', 'Suppressions nothing needs any more (run with `--prune-suppressions`):', '');
        for (const stale of report.staleSuppressions) {
            lines.push(
                `- \`${stale.folder}\` ${stale.id}: suppressed at ${stale.count}, ${stale.measured === undefined ? 'fixed' : `now ${stale.measured}`}`,
            );
        }
    }
    return `${lines.join('\n')}\n`;
}

function encodeUri(path: string): string {
    return path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

function escapeData(text: string): string {
    return text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeProperty(text: string): string {
    return escapeData(text).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

function escapeCell(text: string): string {
    return text.replaceAll('|', String.raw`\|`).replaceAll('\n', ' ');
}
