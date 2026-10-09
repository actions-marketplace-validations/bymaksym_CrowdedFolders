import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';

import { HELP } from './help.ts';
import type { Io } from './io.ts';
import { run } from './main.ts';

const roots: string[] = [];
after(() => {
    for (const root of roots) {
        rmSync(root, { recursive: true, force: true });
    }
});

/** A repository on disk (without git: the file list comes from walking it). */
function repository(files: Readonly<Record<string, string>>): string {
    const root = mkdtempSync(join(tmpdir(), 'crowded-folders-'));
    roots.push(root);
    for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
    }
    return root;
}

interface Ran {
    readonly code: number;
    readonly out: string;
    readonly err: string;
}

async function cli(cwd: string, args: readonly string[], stdin = ''): Promise<Ran> {
    let out = '';
    let error = '';
    const io: Io = {
        cwd,
        env: {},
        stdoutIsTTY: false,
        write: text => {
            out += text;
        },
        error: text => {
            error += text;
        },
        readStdin: () => Promise.resolve(stdin),
    };
    const code = await run(args, io);
    return { code, out, err: error };
}

const render = {
    'cli/render-json.ts': '',
    'cli/render-text.ts': '',
    'cli/render-sarif.ts': '',
    'cli/render-pr.ts': '',
    'cli/main.ts': '',
};

describe('the command', () => {
    it('finds a prefix group with no configuration, says which presets it used, and fails', async () => {
        const root = repository(render);
        const ran = await cli(root, []);
        assert.equal(ran.code, 1);
        assert.match(ran.out, /cli\/\n {2}✖ error {2}prefix-groups {2}4 modules start with "render"/u);
        assert.match(ran.err, /No configuration file: used the presets detected — recommended/u);
    });

    it('passes a clean repository', async () => {
        const root = repository({ 'src/a.ts': '', 'src/b.ts': '' });
        const ran = await cli(root, []);
        assert.equal(ran.code, 0);
        assert.match(ran.out, /No crowded folders/u);
    });

    it('reads its configuration from upwards, and resolves the root to the configuration folder', async () => {
        const root = repository({
            ...render,
            'crowded-folders.config.json': JSON.stringify({
                extends: ['recommended'],
                overrides: [
                    { folders: ['cli'], reason: 'renderers are one family', rules: { 'prefix-groups': 'off' } },
                ],
            }),
        });
        const ran = await cli(join(root, 'cli'), []);
        assert.equal(ran.code, 0, ran.out + ran.err);
        assert.equal(ran.err, '');
    });

    it('rejects a configuration with a problem, saying where, with exit code 2', async () => {
        const root = repository({
            ...render,
            'crowded-folders.config.json': '{ "overrides": [{ "folders": ["cli"] }] }',
        });
        const ran = await cli(root, []);
        assert.equal(ran.code, 2);
        assert.match(ran.err, /overrides\[0\]: needs "reason"/u);
    });

    it('refuses two configurations in one folder', async () => {
        const root = repository({
            'crowded-folders.config.json': '{}',
            'crowded-folders.config.jsonc': '{}',
            'a.ts': '',
        });
        const ran = await cli(root, []);
        assert.equal(ran.code, 2);
        assert.match(ran.err, /more than one crowded-folders configuration/u);
    });

    it('reads the file list from standard input', async () => {
        const root = repository({});
        const ran = await cli(root, ['--stdin', '--format', 'json'], Object.keys(render).join('\n'));
        assert.equal(ran.code, 1);
        const json = JSON.parse(ran.out) as { findings: { key: string }[]; summary: { filesChecked: number } };
        assert.equal(json.findings[0]?.key, 'render');
        assert.equal(json.summary.filesChecked, 5);
    });

    it('checks only the folders given, and accepts a file for its folder', async () => {
        const root = repository({
            ...render,
            ...Object.fromEntries(Object.keys(render).map(path => [path.replace('cli/', 'lib/'), ''])),
        });
        const ran = await cli(root, ['lib/main.ts', '--format', 'json']);
        const json = JSON.parse(ran.out) as { findings: { folder: string }[] };
        assert.deepEqual(
            json.findings.map(finding => finding.folder),
            ['lib'],
        );
        assert.equal((await cli(root, ['../elsewhere'])).code, 2);
    });

    it('adopts a repository with --suppress-all, then fails only on what is new or stale', async () => {
        const root = repository(render);
        const adopted = await cli(root, ['--suppress-all']);
        assert.equal(adopted.code, 0, adopted.out);
        const file = JSON.parse(readFileSync(join(root, 'crowded-folders-suppressions.json'), 'utf8')) as unknown;
        assert.deepEqual(file, { version: 1, suppressions: { cli: { 'prefix-groups#render': { count: 4 } } } });

        assert.equal((await cli(root, [])).code, 0);
        writeFileSync(join(root, 'cli/render-markdown.ts'), '');
        const grown = await cli(root, []);
        assert.equal(grown.code, 1);
        assert.match(grown.out, /it has grown/u);

        rmSync(join(root, 'cli/render-markdown.ts'));
        rmSync(join(root, 'cli/render-pr.ts'));
        const stale = await cli(root, []);
        assert.equal(stale.code, 1);
        assert.match(stale.out, /Suppressions nothing needs any more/u);
        assert.equal((await cli(root, ['--pass-on-unpruned-suppressions'])).code, 0);
        assert.equal((await cli(root, ['--prune-suppressions'])).code, 0);
        assert.deepEqual(JSON.parse(readFileSync(join(root, 'crowded-folders-suppressions.json'), 'utf8')), {
            version: 1,
            suppressions: {},
        });
    });

    it('fails on warnings only past --max-warnings, and --quiet hides them', async () => {
        const root = repository({
            ...render,
            'crowded-folders.config.json': '{ "rules": { "prefix-groups": "warn" } }',
        });
        assert.equal((await cli(root, [])).code, 0);
        assert.equal((await cli(root, ['--max-warnings', '0'])).code, 1);
        assert.match((await cli(root, ['--quiet'])).out, /No crowded folders/u);
    });

    it('writes the report to a file with --output', async () => {
        const root = repository(render);
        const ran = await cli(root, ['--format', 'sarif', '--output', 'report.sarif']);
        assert.equal(ran.out, '');
        assert.match(readFileSync(join(root, 'report.sarif'), 'utf8'), /"version": "2.1.0"/u);
    });

    it('init writes a configuration with the presets it detects, and will not overwrite one', async () => {
        const root = repository({ ...render, 'Cargo.toml': '[package]', 'src/main.rs': '' });
        const ran = await cli(root, ['init']);
        assert.equal(ran.code, 0, ran.err);
        const config = JSON.parse(readFileSync(join(root, 'crowded-folders.config.json'), 'utf8')) as {
            extends: string[];
            $schema: string;
        };
        assert.deepEqual(config.extends, ['recommended', 'rust']);
        assert.match(config.$schema, /schema\.json$/u);
        assert.match(ran.out, /--suppress-all/u);
        assert.equal((await cli(root, ['init'])).code, 2);
        assert.equal((await cli(root, ['init', '--force', '--preset', 'strict'])).code, 0);
        assert.deepEqual(
            (JSON.parse(readFileSync(join(root, 'crowded-folders.config.json'), 'utf8')) as { extends: string[] })
                .extends,
            ['strict'],
        );
    });

    it('explains a folder: modules, groups, rules and problems', async () => {
        const root = repository(render);
        const ran = await cli(root, ['explain', 'cli']);
        assert.equal(ran.code, 0, ran.err);
        assert.match(ran.out, /render-json ← render-json\.ts {2}· render json {2}· render/u);
        assert.match(ran.out, /error prefix-groups/u);
        assert.equal((await cli(root, ['explain', 'nowhere'])).code, 2);
    });

    it('prints the configuration in effect, for the repository and for one folder', async () => {
        const root = repository(render);
        const whole = JSON.parse((await cli(root, ['print-config'])).out) as { layers: string[] };
        assert.deepEqual(whole.layers, ['preset "recommended"', '(the command line)']);
        const one = JSON.parse((await cli(root, ['print-config', '.'])).out) as { rules: Record<string, unknown> };
        assert.deepEqual(one.rules['max-files'], ['error', { max: 40, count: 'modules', dotfiles: false, hint: '' }]);
    });

    it('lists presets and rules', async () => {
        const root = repository({});
        assert.match((await cli(root, ['presets'])).out, /^recommended\n/u);
        assert.match((await cli(root, ['rules'])).out, /^max-files\n/u);
    });

    it('explains a wrong command line with exit code 2', async () => {
        const root = repository({});
        for (const args of [
            ['--nope'],
            ['--format', 'xml'],
            ['--max-warnings', '-1'],
            ['explain'],
            ['--stdin', '--no-git'],
            ['--color', '--no-color'],
        ]) {
            const ran = await cli(root, args);
            assert.equal(ran.code, 2, args.join(' '));
            assert.match(ran.err, /--help/u);
        }
    });

    it('prints help and version', async () => {
        const root = repository({});
        assert.equal((await cli(root, ['--help'])).out, HELP);
        assert.match((await cli(root, ['--version'])).out, /^\d+\.\d+\.\d+\n$/u);
    });
});

describe('the help', () => {
    it('lists every option the parser accepts', () => {
        const source = readFileSync(new URL('args.ts', import.meta.url), 'utf8');
        const options = [...source.matchAll(/^ {16}'?([a-z-]+)'?: \{ type:/gmu)].map(match => match[1]);
        assert.ok(options.length > 10);
        for (const option of options) {
            assert.ok(HELP.includes(`--${option ?? ''}`), `--${option ?? ''} is not in the help`);
        }
    });
});
