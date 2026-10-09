// @ts-check
/**
 * Runs every check that does not write, one after another, and prints a summary: what passed, what
 * failed, what only reports. `pnpm run check:all` (or `just check`) before saying something is done.
 *
 * Each check runs with its output visible; the summary at the end is what decides. The exit code is
 * that of the summary, never that of the last command, so piping it somewhere cannot hide a failure.
 *
 * Usage: node tooling/check.mjs [--all]   (without --all, the slow ones are skipped)
 */
import { spawnSync } from 'node:child_process';
import { delimiter, join, resolve } from 'node:path';
import { styleText } from 'node:util';

/** @typedef {{ title: string, cmd: string, slow?: boolean, soft?: boolean }} Check */

/** @type {Check[]} */
const CHECKS = [
    { title: 'Types (tsc)', cmd: 'pnpm run typecheck' },
    { title: 'Lint (ESLint, with types)', cmd: 'eslint' },
    { title: 'Formatting (Prettier)', cmd: 'prettier --check .' },
    { title: 'Spelling (cspell)', cmd: 'cspell lint --no-progress --no-summary' },
    { title: 'Secrets (secretlint)', cmd: 'pnpm run -s secrets:scan' },
    { title: 'Tests, with coverage thresholds', cmd: 'pnpm run test:coverage', slow: true },
    { title: 'Build', cmd: 'pnpm run build', slow: true },
    { title: 'The tool on this repository', cmd: 'node bin/crowded-folders.js', slow: true },
    { title: 'The package (publint, attw)', cmd: 'pnpm run package:lint', slow: true },
    { title: 'The tarball, installed and run', cmd: 'node tooling/test-package.mjs', slow: true },
    { title: 'Unused code (knip)', cmd: 'pnpm run -s knip', soft: true },
    { title: 'Duplicates in the lockfile', cmd: 'pnpm dedupe --check', soft: true },
    { title: 'Known vulnerabilities', cmd: 'pnpm audit --audit-level high', soft: true },
];

const all = process.argv.includes('--all');
const root = resolve(import.meta.dirname, '..');
const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') ?? 'PATH';
const env = {
    ...process.env,
    [pathKey]: `${join(root, 'node_modules', '.bin')}${delimiter}${process.env[pathKey] ?? ''}`,
};

/** @type {{ check: Check, state: 'pass' | 'fail' | 'warn' | 'skip', seconds: number }[]} */
const results = [];
for (const check of CHECKS) {
    if (check.slow && !all) {
        results.push({ check, state: 'skip', seconds: 0 });
        continue;
    }
    console.log(styleText('bold', `\n▶ ${check.title}`));
    const started = performance.now();
    const { status } = spawnSync(check.cmd, { cwd: root, shell: true, stdio: 'inherit', env });
    const seconds = (performance.now() - started) / 1000;
    const failed = status !== 0;
    results.push({ check, state: failed ? (check.soft ? 'warn' : 'fail') : 'pass', seconds });
}

console.log(styleText('bold', '\n─── Summary ───'));
const marks = {
    pass: styleText('green', '✔'),
    fail: styleText('red', '✘'),
    warn: styleText('yellow', '⚠'),
    skip: styleText('dim', '·'),
};
for (const { check, state, seconds } of results) {
    const note = state === 'skip' ? styleText('dim', 'skipped (--all runs it)') : `${seconds.toFixed(1)} s`;
    console.log(`${marks[state]} ${check.title.padEnd(36)} ${note}`);
}
const failed = results.filter(result => result.state === 'fail');
const warned = results.filter(result => result.state === 'warn');
console.log(
    failed.length === 0
        ? `\nNo failures${warned.length > 0 ? ` (${warned.length} report(s) that do not block)` : ''}.`
        : `\n${failed.length} check(s) failed: ${failed.map(result => result.check.title).join(', ')}.`,
);
process.exitCode = failed.length === 0 ? 0 : 1;
