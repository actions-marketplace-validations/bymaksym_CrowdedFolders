import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Finding } from './engine.ts';
import {
    addSuppressions,
    applySuppressions,
    EMPTY_SUPPRESSIONS,
    parseSuppressions,
    pruneSuppressions,
    serialiseSuppressions,
    suppressionId,
} from './suppressions.ts';

const finding = (
    folder: string,
    rule: string,
    measured: number,
    key?: string,
    severity: 'error' | 'warn' = 'error',
): Finding => ({
    rule,
    severity,
    folder,
    message: `${rule} in ${folder}`,
    key,
    measured,
    limit: undefined,
    files: [],
    moves: [],
    url: undefined,
});

describe('suppressions', () => {
    const today = [
        finding('src', 'max-files', 30),
        finding('cli', 'prefix-groups', 5, 'render'),
        finding('a', 'max-files', 25, undefined, 'warn'),
    ];

    it('records errors only, with the number measured, sorted', () => {
        const file = addSuppressions(EMPTY_SUPPRESSIONS, today);
        assert.deepEqual(file, {
            version: 1,
            suppressions: { cli: { 'prefix-groups#render': { count: 5 } }, src: { 'max-files': { count: 30 } } },
        });
        assert.deepEqual(addSuppressions(EMPTY_SUPPRESSIONS, today, ['max-files']).suppressions, {
            src: { 'max-files': { count: 30 } },
        });
        assert.equal(suppressionId(today[1] ?? finding('', '', 0)), 'prefix-groups#render');
    });

    it('lets a suppressed problem stay or shrink, but reports it when it grows', () => {
        const file = addSuppressions(EMPTY_SUPPRESSIONS, today);
        const same = applySuppressions(today, file);
        assert.equal(same.suppressed.length, 2);
        assert.equal(same.kept.length, 1);
        assert.deepEqual(same.stale, []);

        const grown = applySuppressions([finding('src', 'max-files', 31)], file);
        assert.equal(grown.kept.length, 1);
        assert.match(grown.kept[0]?.message ?? '', /Suppressed at 30; it has grown/u);
    });

    it('calls stale what is fixed or lower than remembered, and pruning lowers and removes it', () => {
        const file = addSuppressions(EMPTY_SUPPRESSIONS, today);
        const later = [finding('src', 'max-files', 28)];
        const outcome = applySuppressions(later, file);
        assert.deepEqual(outcome.stale, [
            { folder: 'cli', id: 'prefix-groups#render', count: 5, measured: undefined },
            { folder: 'src', id: 'max-files', count: 30, measured: 28 },
        ]);
        const pruned = pruneSuppressions(file, later);
        assert.deepEqual(pruned.suppressions, { src: { 'max-files': { count: 28 } } });
        assert.deepEqual(applySuppressions(later, pruned).stale, []);
    });

    it('never suppresses a configuration warning', () => {
        const stale = finding('.', 'config/unused-override', 1, 'x');
        assert.equal(addSuppressions(EMPTY_SUPPRESSIONS, [stale]).suppressions['.'], undefined);
    });

    it('reads back what it writes, and explains a file it cannot read', () => {
        const file = addSuppressions(EMPTY_SUPPRESSIONS, today);
        assert.deepEqual(parseSuppressions(JSON.parse(serialiseSuppressions(file))), file);
        assert.match(parseSuppressions({ version: 2 }) as string, /not a crowded-folders suppressions file/u);
        assert.match(
            parseSuppressions({ version: 1, suppressions: { a: { b: { count: -1 } } } }) as string,
            /without a whole "count"/u,
        );
        assert.match(parseSuppressions({ version: 1, suppressions: { a: 3 } }) as string, /not an object/u);
    });
});
