import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BUILT_IN_PRESETS } from '../presets/index.ts';
import { BUILT_IN_RULES } from '../rules/index.ts';
import { validate } from './json-schema.ts';
import { parseJsonc, stripJsonc } from './jsonc.ts';
import { applySetting, mergeLayer, mergeList } from './merge.ts';
import { configSchema } from './schema.ts';
import { EMPTY_CONFIG } from './types.ts';
import { validateConfig } from './validate.ts';

const presets = Object.keys(BUILT_IN_PRESETS);
const problemsOf = (value: unknown) => validateConfig(value, BUILT_IN_RULES, presets);

describe('parseJsonc', () => {
    it('reads comments and trailing commas, and leaves strings alone', () => {
        const text = `{
            // a reason
            "a": "// not a comment", /* block
            comment */ "b": [1, 2,],
            "c": "\\"/*\\"",
        }`;
        assert.deepEqual(parseJsonc(text), { a: '// not a comment', b: [1, 2], c: '"/*"' });
    });

    it('keeps line numbers, so JSON errors point at the right line', () => {
        const stripped = stripJsonc('{\n/* one\ntwo */\n"a": 1\n}');
        assert.equal(stripped.split('\n').length, 5);
        assert.throws(() => parseJsonc('{\n// x\n"a": }'), SyntaxError);
    });

    it('skips a byte order mark', () => {
        assert.deepEqual(parseJsonc('\u{FEFF}{"a":1}'), { a: 1 });
    });
});

describe('mergeList', () => {
    it('appends without repeating and removes "!x"', () => {
        assert.deepEqual(mergeList(['a', 'b'], ['b', 'c', '!a']), ['b', 'c']);
        assert.deepEqual(mergeList(['a'], undefined), ['a']);
    });
});

describe('applySetting', () => {
    it('keeps options under a bare severity, and merges them under a tuple', () => {
        const first = applySetting(undefined, ['error', { max: 10, ignore: ['use'] }]);
        assert.deepEqual(applySetting(first, 'warn'), { severity: 'warn', options: { max: 10, ignore: ['use'] } });
        assert.deepEqual(applySetting(first, ['error', { ignore: ['test', '!use'] }]), {
            severity: 'error',
            options: { max: 10, ignore: ['test'] },
        });
        assert.deepEqual(applySetting(undefined, ['warn']), { severity: 'warn', options: {} });
    });
});

describe('mergeLayer', () => {
    it('accumulates lists, keeps the last scalar, and records where overrides came from', () => {
        const base = mergeLayer(
            EMPTY_CONFIG,
            {
                exclude: ['vendor'],
                naming: { companions: ['_test$'], ignoreLeadingWords: ['I'] },
                suppressions: 'a.json',
            },
            'preset "x"',
            false,
        );
        const merged = mergeLayer(
            base,
            {
                exclude: ['!vendor', 'build'],
                naming: { groupNumericPrefixes: true },
                overrides: [{ folders: ['a'], reason: 'r' }],
            },
            'mine.json',
            true,
        );
        assert.deepEqual(merged.exclude, ['build']);
        assert.deepEqual(merged.naming, {
            companions: ['_test$'],
            ignoreLeadingWords: ['i'],
            groupNumericPrefixes: true,
        });
        assert.equal(merged.suppressions, 'a.json');
        assert.deepEqual(merged.layers, ['preset "x"', 'mine.json']);
        assert.equal(merged.overrides[0]?.own, true);
        assert.equal(merged.overrides[0]?.origin, 'mine.json');
    });
});

describe('validateConfig', () => {
    it('accepts an empty configuration and a full one', () => {
        assert.deepEqual(problemsOf({}), []);
        assert.deepEqual(
            problemsOf({
                $schema: 'x',
                extends: ['recommended', './base.json'],
                plugins: ['crowded-folders-plugin-x'],
                include: ['src/**'],
                exclude: ['fixtures'],
                naming: { companions: ['_test$'], ignoreLeadingWords: ['i'], groupNumericPrefixes: false },
                rules: { 'max-files': ['error', { max: 10, count: 'modules' }], 'prefix-groups': 'warn' },
                overrides: [{ folders: ['src/legacy'], reason: 'being rewritten', rules: { 'max-files': 'off' } }],
                suppressions: 'suppressions.json',
            }),
            [],
        );
    });

    it('requires a reason on every override', () => {
        const problems = problemsOf({ overrides: [{ folders: ['a'], rules: { 'max-files': 'off' } }] });
        assert.deepEqual(problems, [{ at: 'overrides[0]', message: 'needs "reason"' }]);
        assert.match(
            problemsOf({ overrides: [{ folders: ['a'], reason: '' }] })[0]?.message ?? '',
            /must not be empty/u,
        );
    });

    it('names the setting that is wrong, and suggests the one that was meant', () => {
        assert.deepEqual(problemsOf({ exlude: ['a'] }), [
            { at: 'exlude', message: 'is not a known setting; did you mean "exclude"?' },
        ]);
        const [problem] = problemsOf({ rules: { 'max-files': ['error', { max: 0 }] } });
        assert.equal(problem?.at, 'rules["max-files"][1].max');
        assert.match(problem?.message ?? '', /at least 1/u);
        assert.match(problemsOf({ rules: { 'max-files': 'loud' } })[0]?.message ?? '', /"error", "warn", "off"/u);
    });

    it('rejects a rule nobody defines, a regular expression that does not compile and a broken glob', () => {
        assert.match(
            problemsOf({ rules: { 'max-file': 'error' } })[0]?.message ?? '',
            /not a rule; known rules: max-files/u,
        );
        assert.match(problemsOf({ rules: { 'x/y': 'error' } })[0]?.message ?? '', /no plugin/u);
        assert.match(
            problemsOf({ naming: { companions: ['(unclosed'] } })[0]?.message ?? '',
            /not a regular expression/u,
        );
        assert.match(problemsOf({ exclude: ['src/{a'] })[0]?.message ?? '', /leaves a "\{" open/u);
        assert.match(problemsOf({ naming: { ignoreLeadingWords: ['two words'] } })[0]?.message ?? '', /not one word/u);
    });
});

describe('configSchema', () => {
    it('is valid draft-07 in the subset this package writes, and describes every built-in rule', () => {
        const schema = configSchema(BUILT_IN_RULES, presets);
        assert.equal(schema.$schema, 'https://json-schema.org/draft-07/schema#');
        assert.deepEqual(
            Object.keys(schema.properties?.['rules']?.properties ?? {}).toSorted((a, b) => a.localeCompare(b)),
            Object.keys(BUILT_IN_RULES).toSorted((a, b) => a.localeCompare(b)),
        );
        assert.deepEqual(validate({ rules: { 'max-files': ['error', { max: 3 }] } }, schema), []);
    });
});
