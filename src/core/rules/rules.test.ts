import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeLayer } from '../config/merge.ts';
import { type Config, EMPTY_CONFIG } from '../config/types.ts';
import { type Finding, runEngine } from '../engine.ts';
import { BUILT_IN_RULES } from './index.ts';

/** Runs the built-in rules over a list of paths with one configuration layer. */
function findings(files: readonly string[], config: Config): Finding[] {
    const resolved = mergeLayer(EMPTY_CONFIG, config, 'test', true);
    return [...runEngine({ files, config: resolved, rules: BUILT_IN_RULES }).findings];
}

const many = (folder: string, count: number): string[] =>
    Array.from({ length: count }, (_, index) => `${folder}/file${index}.ts`);

describe('max-files', () => {
    it('reports a folder over the limit, and not one at it', () => {
        const result = findings([...many('a', 5), ...many('b', 4)], { rules: { 'max-files': ['error', { max: 4 }] } });
        assert.equal(result.length, 1);
        assert.equal(result[0]?.folder, 'a');
        assert.equal(result[0]?.measured, 5);
        assert.equal(result[0]?.limit, 4);
        assert.match(result[0]?.message ?? '', /5 files, over the limit of 4/u);
    });

    it('counts a module and its companions once with count: "modules"', () => {
        const files = ['c/a.ts', 'c/a.spec.ts', 'c/a.html', 'c/b.ts', 'c/b.spec.ts'];
        assert.equal(findings(files, { rules: { 'max-files': ['error', { max: 2, count: 'files' }] } }).length, 1);
        assert.equal(findings(files, { rules: { 'max-files': ['error', { max: 2, count: 'modules' }] } }).length, 0);
    });

    it('leaves dotfiles out unless asked', () => {
        const files = ['.a', '.b', '.c', 'x.ts'];
        assert.equal(findings(files, { rules: { 'max-files': ['error', { max: 2 }] } }).length, 0);
        assert.equal(findings(files, { rules: { 'max-files': ['error', { max: 2, dotfiles: true }] } }).length, 1);
    });

    it('adds the hint of the preset to the message', () => {
        const [finding] = findings(many('a', 3), {
            rules: { 'max-files': ['error', { max: 2, hint: 'In Go a folder is a package.' }] },
        });
        assert.match(finding?.message ?? '', /folder is a package\.$/u);
    });
});

describe('prefix-groups', () => {
    const render = [
        'cli/render-json.ts',
        'cli/render-text.ts',
        'cli/render-sarif.ts',
        'cli/render-pr.ts',
        'cli/main.ts',
    ];

    it('reports the modules that share a first word, with the folder they belong in', () => {
        const [finding, ...rest] = findings(render, { rules: { 'prefix-groups': 'error' } });
        assert.equal(rest.length, 0);
        assert.equal(finding?.key, 'render');
        assert.equal(finding?.measured, 4);
        assert.match(finding?.message ?? '', /cli\/render\/\.$/u);
        assert.deepEqual(finding?.moves[0], { from: 'cli/render-json.ts', to: 'cli/render/render-json.ts' });
    });

    it('counts modules, not files, and needs `min` of them', () => {
        const files = [
            'x/user-a.ts',
            'x/user-a.spec.ts',
            'x/user-b.ts',
            'x/user-b.spec.ts',
            'x/user-c.ts',
            'x/other.ts',
        ];
        assert.equal(findings(files, { rules: { 'prefix-groups': ['error', { min: 4 }] } }).length, 0);
        assert.equal(findings(files, { rules: { 'prefix-groups': ['error', { min: 3 }] } }).length, 1);
    });

    it('counts the module named exactly like the prefix: it is the main file of the group', () => {
        const files = ['s/report.ts', 's/report-nav.ts', 's/report-tab.ts', 's/report-messages.ts', 's/other.ts'];
        assert.equal(findings(files, { rules: { 'prefix-groups': 'error' } })[0]?.measured, 4);
    });

    it('stays quiet when the folder already has the name, or when the group is the whole folder', () => {
        const inside = render.map(path => path.replace('cli/', 'cli/render/'));
        assert.equal(
            findings(
                inside.filter(path => !path.endsWith('main.ts')),
                { rules: { 'prefix-groups': 'error' } },
            ).length,
            0,
        );
        const whole = render.filter(path => !path.endsWith('main.ts'));
        assert.equal(findings(whole, { rules: { 'prefix-groups': 'error' } }).length, 0);
        const plural = ['hooks/hook-a.ts', 'hooks/hook-b.ts', 'hooks/hook-c.ts', 'hooks/hook-d.ts', 'hooks/index.ts'];
        assert.equal(findings(plural, { rules: { 'prefix-groups': 'error' } }).length, 0);
    });

    it('skips ignored prefixes and ignored leading words', () => {
        const hooks = ['h/useA.ts', 'h/useB.ts', 'h/useC.ts', 'h/useD.ts', 'h/index.ts'];
        assert.equal(findings(hooks, { rules: { 'prefix-groups': 'error' } }).length, 1);
        assert.equal(findings(hooks, { rules: { 'prefix-groups': ['error', { ignore: ['use'] }] } }).length, 0);
        const interfaces = [
            's/IUserService.cs',
            's/IUserStore.cs',
            's/IOrderService.cs',
            's/IOrderStore.cs',
            's/IOrderView.cs',
            's/Program.cs',
        ];
        assert.equal(findings(interfaces, { rules: { 'prefix-groups': ['error', { min: 3 }] } })[0]?.key, 'i');
        const read = findings(interfaces, {
            naming: { ignoreLeadingWords: ['i'] },
            rules: { 'prefix-groups': ['error', { min: 3 }] },
        });
        assert.deepEqual(
            read.map(finding => finding.key),
            ['order'],
        );
    });

    it('does not group numbered or dated files', () => {
        const migrations = [
            'm/0001_initial.py',
            'm/0002_user.py',
            'm/0003_user_email.py',
            'm/0004_order.py',
            'm/0005_x.py',
        ];
        assert.equal(findings(migrations, { rules: { 'prefix-groups': ['error', { min: 2 }] } }).length, 0);
    });

    it('does not group the entries of a numbered series (jasontaylordev/CleanArchitecture docs/decisions)', () => {
        const decisions = [
            'docs/decisions/ADR-000-template.md',
            'docs/decisions/ADR-001-Use-EFCore-In-Application-Layer.md',
            'docs/decisions/ADR-002-Aspire-For-Orchestration-And-Testing.md',
            'docs/decisions/ADR-003-MediatR-Contracts-In-Domain.md',
            'docs/decisions/README.md',
        ];
        assert.deepEqual(findings(decisions, { rules: { 'prefix-groups': 'error' } }), []);
        // One title that starts with a digit does not make the rest a series (tomlooman/ActionRoguelike).
        const meshes = [
            'm/SM_1MeterSphere.uasset',
            'm/SM_Black_Hole.uasset',
            'm/SM_Coin.uasset',
            'm/SM_Sphere.uasset',
            'm/T_x.uasset',
        ];
        assert.equal(findings(meshes, { rules: { 'prefix-groups': 'error' } }).length, 1);
    });

    it('does not group one file in several languages (sharkdp/bat doc/, localsend app/lib/gen/)', () => {
        const readmes = [
            'doc/README-ja.md',
            'doc/README-ko.md',
            'doc/README-ru.md',
            'doc/README-zh.md',
            'doc/logo.png',
        ];
        const strings = [
            ...['strings.g.dart', 'strings_ar.g.dart', 'strings_pt_BR.g.dart', 'strings_zh_Hant_TW.g.dart'].map(
                name => `gen/${name}`,
            ),
            'gen/assets.gen.dart',
        ];
        assert.deepEqual(findings([...readmes, ...strings], { rules: { 'prefix-groups': 'error' } }), []);
        const notLanguages = ['src/user-list.ts', 'src/user-card.ts', 'src/user-de.ts', 'src/user-es.ts', 'src/app.ts'];
        assert.equal(findings(notLanguages, { rules: { 'prefix-groups': 'error' } }).length, 1);
    });

    it('groups by more words when asked', () => {
        const files = ['x/user-list-a.ts', 'x/user-list-b.ts', 'x/user-card-a.ts', 'x/user-card-b.ts', 'x/z.ts'];
        assert.equal(findings(files, { rules: { 'prefix-groups': 'error' } })[0]?.key, 'user');
        assert.deepEqual(
            findings(files, { rules: { 'prefix-groups': ['error', { min: 2, words: 2 }] } }).map(
                finding => finding.key,
            ),
            ['user-card', 'user-list'],
        );
    });
});

describe('redundant-prefix', () => {
    it("reports modules that repeat the folder's name, and suggests the shorter name in the file's own convention", () => {
        const files = [
            'render/render-json.ts',
            'render/render-json.spec.ts',
            'render/RenderText.cs',
            'render/render.ts',
            'render/other.ts',
        ];
        const [finding] = findings(files, { rules: { 'redundant-prefix': 'error' } });
        assert.equal(finding?.measured, 2);
        assert.deepEqual(finding?.moves, [
            { from: 'render/RenderText.cs', to: 'render/Text.cs' },
            { from: 'render/render-json.spec.ts', to: 'render/json.spec.ts' },
            { from: 'render/render-json.ts', to: 'render/json.ts' },
        ]);
    });

    it('accepts the singular of a plural folder, and leaves the root alone', () => {
        const files = ['users/user-list.ts', 'users/user-card.ts', 'root-a.ts', 'root-b.ts'];
        const result = findings(files, { rules: { 'redundant-prefix': 'error' } });
        assert.deepEqual(
            result.map(finding => finding.folder),
            ['users'],
        );
    });
});

describe('max-folders and single-file-folders', () => {
    it('counts subfolders', () => {
        const files = Array.from({ length: 4 }, (_, index) => `features/f${index}/index.ts`);
        assert.equal(findings(files, { rules: { 'max-folders': ['error', { max: 3 }] } })[0]?.folder, 'features');
    });

    it('reports a folder holding a single file and nothing else', () => {
        const result = findings(['a/only.ts', 'b/x.ts', 'b/y.ts', 'c/d/e.ts'], {
            rules: { 'single-file-folders': 'warn' },
        });
        assert.deepEqual(
            result.map(finding => [finding.folder, finding.severity]),
            [
                ['a', 'warn'],
                ['c/d', 'warn'],
            ],
        );
    });
});
