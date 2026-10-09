// @ts-check
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import n from 'eslint-plugin-n';
import regexp from 'eslint-plugin-regexp';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default defineConfig(
    {
        ignores: ['dist/**', 'coverage/**', '.field-trial/**', 'node_modules/**'],
    },
    {
        // A silence that silences nothing is an error, and every silence says why.
        linterOptions: { reportUnusedDisableDirectives: 'error' },
    },
    {
        files: ['**/*.{ts,mjs,js}'],
        extends: [
            js.configs.recommended,
            unicorn.configs.recommended,
            regexp.configs['flat/recommended'],
            comments.recommended,
        ],
        plugins: { 'simple-import-sort': simpleImportSort },
        rules: {
            '@eslint-community/eslint-comments/require-description': 'error',
            '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
            eqeqeq: 'error',
            curly: ['error', 'multi-line'],
            'prefer-template': 'error',
            'no-param-reassign': 'error',
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],

            // Each of these is off for a reason measured on this code:
            'unicorn/no-null': 'off', // JSON output uses null for "absent"; it is part of the format
            'unicorn/prevent-abbreviations': 'off', // `args`, `dir`, `src` read better than the long forms here
            'unicorn/no-array-reduce': 'off', // folding layers of configuration is what reduce is for
            'unicorn/prefer-ternary': ['error', 'only-single-line'],
            'unicorn/no-process-exit': 'off', // the tooling scripts are commands; the package itself never exits
            'unicorn/import-style': 'off', // `import { join } from 'node:path'` is the style here
            'unicorn/prefer-string-raw': 'off', // regular expressions in strings read better escaped than raw here
            'unicorn/no-nested-ternary': 'off', // Prettier formats the few there are so they read as a table
            'unicorn/consistent-function-scoping': 'off', // small helpers stay next to the only code that uses them
            'unicorn/prefer-top-level-await': 'off', // the package is a library; top-level await is for the entry points
            'unicorn/no-array-callback-reference': 'off', // `map(compileGlob)` is clearer than a wrapper arrow
            'unicorn/prefer-set-methods': 'off', // Set#union and friends are not in Node 20.19, the oldest supported
            'unicorn/prefer-iterator-to-array': 'off', // Iterator helpers are not in Node 20.19
            'unicorn/prefer-promise-with-resolvers': 'off', // Promise.withResolvers is not in Node 20.19
            // Their fixers rewrite every JSDoc comment (no leading asterisks, single lines made
            // multi-line): measured on this code, 43 files rewritten for nothing.
            'unicorn/no-asterisk-prefix-in-documentation-comments': 'off',
            'unicorn/single-line-block-comment-style': 'off',
            'unicorn/name-replacements': 'off', // renamed args to arguments_; the short names are the clearer ones here
            'unicorn/consistent-boolean-name': 'off', // predicates read as verbs here: matchesSelfOrAncestor, keyRestatesPath
            'unicorn/max-nested-calls': 'off', // map(…).join(…) inside a template is three calls deep by nature
            'unicorn/no-unreadable-for-of-expression': 'off', // for (… of Object.entries(x ?? {})) is the clearest form here
            'unicorn/prefer-simple-condition-first': 'off', // guard order is chosen for meaning, not for cost
            'unicorn/no-break-in-nested-loop': 'off', // the glob scanner's continue statements read better in place
            'unicorn/consistent-class-member-order': 'off', // members are ordered by reading flow
        },
    },
    {
        files: ['**/*.ts'],
        extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
            '@typescript-eslint/prefer-readonly': 'error',
            '@typescript-eslint/no-unnecessary-condition': [
                'error',
                { allowConstantLoopConditions: 'only-allowed-literals' },
            ],
            // node:test's describe() and it() return promises the runner awaits itself.
            '@typescript-eslint/no-floating-promises': [
                'error',
                {
                    allowForKnownSafeCalls: [
                        { from: 'package', name: ['describe', 'it', 'test', 'suite'], package: 'node:test' },
                    ],
                },
            ],
        },
    },
    {
        // What runs where `engines` promises: Node 20.19 and later. eslint-plugin-n reads the range
        // from package.json, so a built-in or a node: API added later is an error here, before CI's
        // Node 20.19 job finds it.
        files: ['src/**/*.ts', 'bin/**/*.js'],
        ignores: ['src/**/*.test.ts'],
        plugins: { n },
        settings: { node: { version: '>=20.19.0', typescriptExtensionMap: [['.ts', '.js']] } },
        rules: {
            'n/no-unsupported-features/es-builtins': 'error',
            'n/no-unsupported-features/es-syntax': 'error',
            'n/no-unsupported-features/node-builtins': 'error',
        },
    },
    {
        // The core is pure: it runs anywhere (a browser, a worker) and knows nothing of who uses it.
        // Files, processes and modules are the node layer's job.
        files: ['src/core/**/*.ts'],
        ignores: ['src/core/**/*.test.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            regex: '^node:',
                            message: 'src/core is pure: reading files, git or processes belongs in src/node.',
                        },
                        {
                            regex: String.raw`^\.\./(\.\./)*(node|cli)/`,
                            message: 'src/core does not know the layers that use it.',
                        },
                    ],
                },
            ],
            'no-restricted-globals': ['error', { name: 'process', message: 'src/core is pure: no process here.' }],
        },
    },
    {
        files: ['src/**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off', // a test that is wrong should throw, and that is what ! does
            '@typescript-eslint/no-unnecessary-condition': 'off', // `result[0]?.x` gives a readable failure instead of a TypeError
            'unicorn/no-await-expression-member': 'off', // (await cli(…)).out is the plainest way to read one field
            'max-lines': 'off', // a test file is a list; splitting it scatters what belongs together
        },
    },
    {
        files: ['tooling/**/*.mjs', 'bin/**/*.js', 'examples/**/*.js', '*.config.js', 'eslint.config.js'],
        languageOptions: {
            globals: { process: 'readonly', console: 'readonly', URL: 'readonly', performance: 'readonly' },
        },
        rules: {
            'unicorn/no-top-level-side-effects': 'off', // scripts and configuration files are top-level by design
        },
    },
    prettier,
);
