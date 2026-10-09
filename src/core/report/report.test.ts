import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Finding } from '../engine.ts';
import { formatGithub, formatJson, formatMarkdown, formatSarif } from './machine.ts';
import type { Report } from './report.ts';
import { formatText } from './text.ts';

const finding: Finding = {
    rule: 'prefix-groups',
    severity: 'error',
    folder: 'cli',
    message: '4 modules start with "render": a folder, 100% | sure',
    key: 'render',
    measured: 4,
    limit: 3,
    files: ['cli/render-json.ts', 'cli/render-pr.ts'],
    moves: [{ from: 'cli/render-json.ts', to: 'cli/render/render-json.ts' }],
    url: 'https://example.com/prefix-groups',
};

const report = (findings: readonly Finding[], extra: Partial<Report> = {}): Report => ({
    tool: { name: 'crowded-folders', version: '1.2.3', url: 'https://example.com' },
    findings,
    suppressedCount: 0,
    staleSuppressions: [],
    folderCount: 10,
    fileCount: 100,
    rules: [{ id: 'prefix-groups', description: 'groups', url: 'https://example.com/prefix-groups' }],
    ...extra,
});

describe('formatText', () => {
    it('groups by folder and ends with the totals', () => {
        const text = formatText(
            report([finding, { ...finding, folder: '.', rule: 'max-files', severity: 'warn', key: undefined }]),
            {
                color: false,
                moves: false,
            },
        );
        assert.match(text, /^\. \(the root\)\n {2}⚠ warn /mu);
        assert.match(text, /^cli\/\n {2}✖ error {2}prefix-groups/mu);
        assert.match(text, /1 error, 1 warning in 2 folders \(10 folders and 100 files checked\)\./u);
        assert.match(text, /--moves prints/u);
        assert.equal(text.includes('\u{1B}['), false);
    });

    it('prints moves, colours and stale suppressions when asked', () => {
        const text = formatText(
            report([finding], {
                staleSuppressions: [{ folder: 'src', id: 'max-files', count: 30, measured: 28 }],
                suppressedCount: 2,
            }),
            { color: true, moves: true },
        );
        assert.match(text, /git mv cli\/render-json\.ts cli\/render\/render-json\.ts/u);
        assert.ok(text.includes('\u{1B}[31m'));
        assert.match(text, /suppressed at 30, now 28/u);
        assert.match(text, /2 problems suppressed/u);
    });

    it('says so when there is nothing', () => {
        assert.match(
            formatText(report([]), { color: false, moves: false }),
            /^✔ No crowded folders \(10 folders and 100 files checked\)\.\n$/u,
        );
    });
});

describe('machine formats', () => {
    it('json has a stable shape with nulls for what is missing', () => {
        const json = JSON.parse(formatJson(report([{ ...finding, key: undefined, url: undefined }]))) as Record<
            string,
            unknown
        >;
        assert.deepEqual(Object.keys(json), ['tool', 'summary', 'findings', 'staleSuppressions']);
        assert.deepEqual(json['summary'], {
            errors: 1,
            warnings: 0,
            foldersWithProblems: 1,
            foldersChecked: 10,
            filesChecked: 100,
            suppressed: 0,
        });
        assert.equal((json['findings'] as { key: unknown }[])[0]?.key, null);
    });

    it('sarif points at the first file and names the folder', () => {
        const sarif = JSON.parse(formatSarif(report([finding]))) as {
            runs: {
                results: {
                    message: { text: string };
                    locations: { physicalLocation: { artifactLocation: { uri: string } } }[];
                }[];
            }[];
        };
        const [result] = sarif.runs[0]?.results ?? [];
        assert.equal(result?.locations[0]?.physicalLocation.artifactLocation.uri, 'cli/render-json.ts');
        assert.match(result?.message.text ?? '', /^cli: /u);
    });

    it('github annotations escape what workflow commands would read', () => {
        const line = formatGithub(report([finding]));
        assert.match(
            line,
            /^::error file=cli\/render-json\.ts,title=crowded-folders%3A prefix-groups::cli\/ 4 modules/u,
        );
        assert.match(line, /100%25 \| sure\n$/u);
        assert.equal(formatGithub(report([])), '');
        assert.match(
            formatGithub(report([], { staleSuppressions: [{ folder: 'a', id: 'b', count: 1, measured: undefined }] })),
            /stale suppression.*fixed/u,
        );
    });

    it('markdown escapes table cells and links the rule', () => {
        const markdown = formatMarkdown(report([finding]));
        assert.match(
            markdown,
            /\| `cli` \| \[prefix-groups\]\(https:\/\/example\.com\/prefix-groups\) \| .*100% \\\| sure \|/u,
        );
        assert.match(formatMarkdown(report([])), /No crowded folders/u);
    });
});
