import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeLayer } from './config/merge.ts';
import { type Config, EMPTY_CONFIG } from './config/types.ts';
import { explainFolder, runEngine, selectFiles } from './engine.ts';
import { BUILT_IN_RULES } from './rules/index.ts';
import { defineRule } from './rules/rule.ts';

const resolve = (...layers: Config[]) =>
    layers.reduce(
        (config, layer, index) => mergeLayer(config, layer, `layer ${index}`, index === layers.length - 1),
        EMPTY_CONFIG,
    );

const crowded = Array.from({ length: 6 }, (_, index) => `src/legacy/f${index}.ts`);

describe('selectFiles', () => {
    it('keeps what include allows and drops what exclude names, at any depth', () => {
        const files = ['src/a.ts', 'src/fixtures/x.ts', 'docs/a.md', 'fixtures/y.ts'];
        assert.deepEqual(selectFiles(files, { include: ['src/**'], exclude: ['fixtures'] }), ['src/a.ts']);
        assert.deepEqual(selectFiles(files, { include: [], exclude: [] }), files);
    });
});

describe('runEngine', () => {
    it('applies overrides in order, per folder', () => {
        const config = resolve({
            rules: { 'max-files': ['error', { max: 5 }] },
            overrides: [
                { folders: ['src/legacy'], reason: 'being rewritten', rules: { 'max-files': 'warn' } },
                { folders: ['src/legacy'], reason: 'and allowed more', rules: { 'max-files': ['warn', { max: 10 }] } },
            ],
        });
        assert.equal(runEngine({ files: crowded, config, rules: BUILT_IN_RULES }).findings.length, 0);
        const first = resolve({
            rules: { 'max-files': ['error', { max: 5 }] },
            overrides: [{ folders: ['src/legacy'], reason: 'being rewritten', rules: { 'max-files': 'warn' } }],
        });
        assert.equal(runEngine({ files: crowded, config: first, rules: BUILT_IN_RULES }).findings[0]?.severity, 'warn');
    });

    it('reports an override of the own configuration that matches no folder', () => {
        const config = resolve({
            rules: { 'max-files': ['error', { max: 50 }] },
            overrides: [{ folders: ['src/gone'], reason: 'it was big', rules: { 'max-files': 'off' } }],
        });
        const [finding] = runEngine({ files: crowded, config, rules: BUILT_IN_RULES }).findings;
        assert.equal(finding?.rule, 'config/unused-override');
        assert.equal(finding?.severity, 'warn');
        assert.match(finding?.message ?? '', /"src\/gone".*it was big/u);
    });

    it('does not report an unused override that a preset brought', () => {
        const config = resolve(
            { overrides: [{ folders: ['**/res/*'], reason: 'android', rules: { 'max-files': 'off' } }] },
            { rules: { 'max-files': ['error', { max: 50 }] } },
        );
        assert.equal(runEngine({ files: crowded, config, rules: BUILT_IN_RULES }).findings.length, 0);
    });

    it('reports only the folders asked for, while still counting the rest', () => {
        const files = [...crowded, ...crowded.map(path => path.replace('legacy', 'other'))];
        const config = resolve({ rules: { 'max-files': ['error', { max: 5 }] } });
        const result = runEngine({ files, config, rules: BUILT_IN_RULES, only: ['src/other'] });
        assert.deepEqual(
            result.findings.map(finding => finding.folder),
            ['src/other'],
        );
        assert.equal(result.fileCount, 12);
    });

    it('runs plugin rules with their defaults under the configured options', () => {
        const seen: unknown[] = [];
        const probe = defineRule({
            meta: { description: 'probe', defaultOptions: { a: 1, list: ['x'] } },
            check(folder, { options, report }) {
                seen.push(options);
                if (folder.path === 'src/legacy') {
                    report({ message: 'seen', files: ['f0.ts'] });
                }
            },
        });
        const config = resolve({ rules: { 'p/probe': ['warn', { list: ['y'] }] } });
        const result = runEngine({ files: crowded, config, rules: { ...BUILT_IN_RULES, 'p/probe': probe } });
        assert.deepEqual(seen[0], { a: 1, list: ['x', 'y'] });
        assert.deepEqual(result.findings[0]?.files, ['src/legacy/f0.ts']);
        assert.equal(result.findings[0]?.measured, 1);
    });

    it('sorts findings by folder, then rule, then key', () => {
        const files = ['b/x-1.ts', 'b/x-2.ts', 'b/x-3.ts', 'b/x-4.ts', 'b/y.ts', ...crowded];
        const config = resolve({ rules: { 'max-files': ['error', { max: 4 }], 'prefix-groups': 'error' } });
        assert.deepEqual(
            runEngine({ files, config, rules: BUILT_IN_RULES }).findings.map(
                finding => `${finding.folder} ${finding.rule}`,
            ),
            ['b max-files', 'b prefix-groups', 'src/legacy max-files'],
        );
    });
});

describe('explainFolder', () => {
    it('shows the overrides, the options in effect and the findings of one folder', () => {
        const config = resolve({
            rules: { 'max-files': ['error', { max: 5 }] },
            overrides: [{ folders: ['src/*'], reason: 'why', rules: { 'max-files': ['error', { max: 3 }] } }],
        });
        const explanation = explainFolder({ files: crowded, config, rules: BUILT_IN_RULES }, 'src/legacy');
        assert.equal(explanation?.overrides[0]?.reason, 'why');
        assert.equal(explanation?.rules['max-files']?.effectiveOptions['max'], 3);
        assert.equal(explanation?.findings.length, 1);
        assert.equal(explainFolder({ files: crowded, config, rules: BUILT_IN_RULES }, 'nowhere'), undefined);
    });
});
