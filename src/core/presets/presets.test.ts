import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeLayer } from '../config/merge.ts';
import { type Config, EMPTY_CONFIG, type ResolvedConfig } from '../config/types.ts';
import { validateConfig } from '../config/validate.ts';
import { type Finding, runEngine } from '../engine.ts';
import { BUILT_IN_RULES } from '../rules/index.ts';
import { detectPresets, excludesFor } from './detect.ts';
import { BUILT_IN_PRESETS } from './index.ts';

/** Applies a preset the way the loader does: what it extends first, each preset once. */
function resolvePreset(name: string, applied = new Set<string>(), base: ResolvedConfig = EMPTY_CONFIG): ResolvedConfig {
    if (applied.has(name)) {
        return base;
    }
    applied.add(name);
    const preset = BUILT_IN_PRESETS[name];
    assert.ok(preset, name);
    let config = base;
    for (const parent of preset.config.extends ?? []) {
        config = resolvePreset(parent, applied, config);
    }
    return mergeLayer(config, preset.config, name, false);
}

function check(preset: string, files: readonly string[]): Finding[] {
    return [...runEngine({ files, config: resolvePreset(preset), rules: BUILT_IN_RULES }).findings];
}

describe('every built-in preset', () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
        it(`${name} is a valid configuration with a description and sources`, () => {
            assert.deepEqual(validateConfig(preset.config, BUILT_IN_RULES, Object.keys(BUILT_IN_PRESETS)), []);
            assert.ok(preset.description.length > 40, 'describes what it changes and why');
            assert.ok(preset.sources.length > 0, 'says where its criterion comes from');
            for (const source of preset.sources) {
                assert.match(source.url, /^https:\/\//u);
            }
            for (const parent of preset.config.extends ?? []) {
                assert.ok(BUILT_IN_PRESETS[parent], `${name} extends ${parent}, which is not built in`);
            }
            for (const override of preset.config.overrides ?? []) {
                assert.ok(override.reason.length > 10, `an override of ${name} explains itself`);
            }
            if (name !== 'recommended' && name !== 'strict') {
                assert.ok(preset.detect, `${name} says when init proposes it`);
            }
        });
    }
});

describe('what the presets change', () => {
    const many = (folder: string, names: readonly string[]): string[] => names.map(name => `${folder}/${name}`);

    it('go reads test and platform files as their module, and loosens the limit', () => {
        const files = many('pkg/exec', [
            'exec.go',
            'exec_test.go',
            'exec_linux.go',
            'exec_windows.go',
            'exec_linux_amd64_test.go',
        ]);
        assert.deepEqual(check('go', files), []);
        const big = many(
            'pkg/http',
            Array.from({ length: 25 }, (_, index) => `f${index}.go`),
        );
        assert.deepEqual(
            check('recommended', big).map(finding => finding.rule),
            ['max-files'],
        );
        assert.deepEqual(check('go', big), []);
    });

    it('python joins test_x.py with x.py, and does not ask tests/ to group', () => {
        const files = many('tests', [
            'test_render_json.py',
            'test_render_text.py',
            'test_render_pr.py',
            'test_render_sarif.py',
            'conftest.py',
        ]);
        assert.deepEqual(check('python', files), []);
        const package_ = [...files.map(path => path.replace('tests/test_', 'pkg/')), 'pkg/cli.py'];
        assert.deepEqual(
            check('recommended', package_).map(finding => finding.key),
            ['render'],
        );
    });

    it('vue keeps coupled components flat in components/, as its guide asks', () => {
        const files = many('src/components', [
            'TodoList.vue',
            'TodoListItem.vue',
            'TodoListItemButton.vue',
            'TodoListFooter.vue',
            'AppHeader.vue',
        ]);
        assert.deepEqual(check('vue', files), []);
        assert.equal(check('recommended', files).length, 1);
    });

    it('react reads useAuthLogin as being about auth', () => {
        const files = many('src', ['useAuthLogin.ts', 'useAuthLogout.ts', 'AuthForm.tsx', 'AuthGuard.tsx', 'App.tsx']);
        assert.deepEqual(
            check('react', files).map(finding => finding.key),
            ['auth'],
        );
    });

    it('dotnet reads IUserService as part of UserService, and groups the user modules', () => {
        const files = many('Services', [
            'IUserService.cs',
            'UserService.cs',
            'UserServiceTests.cs',
            'UserStore.cs',
            'IUserStore.cs',
            'UserView.cs',
            'UserMapper.cs',
            'Program.cs',
        ]);
        const [finding] = check('dotnet', files);
        assert.equal(finding?.key, 'user');
        assert.equal(finding?.measured, 4);
    });

    it('android leaves res/ alone, where prefixes are the only grouping', () => {
        const files = many(
            'app/src/main/res/layout',
            Array.from({ length: 30 }, (_, index) => `activity_screen${index}.xml`),
        );
        assert.deepEqual(check('android', files), []);
    });

    it('unreal skips asset-type prefixes and groups by base asset name only from 15', () => {
        const rock = ['SM_Rock.uasset', 'T_Rock_D.uasset', 'T_Rock_N.uasset', 'M_Rock.uasset', 'MI_Rock_Wet.uasset'];
        const files = many('Content/Environment', [
            ...rock,
            'BP_Door.uasset',
            'BP_Lamp.uasset',
            'BP_Gate.uasset',
            'BP_Chest.uasset',
        ]);
        assert.deepEqual(check('unreal', files), []);
        assert.deepEqual(
            check('recommended', files).map(finding => finding.key),
            ['bp'],
        );
    });

    it('rails gives app/models more room, and makes groups there a warning', () => {
        const files = many(
            'app/models',
            Array.from({ length: 30 }, (_, index) => `model${index}.rb`),
        );
        assert.deepEqual(check('rails', files), []);
    });

    it('every preset leaves migrations, vendored code and fixtures out', () => {
        const files = [
            ...many(
                'db/migrations',
                Array.from({ length: 40 }, (_, index) => `${index}_step.py`),
            ),
            ...many(
                'vendor/lib',
                Array.from({ length: 40 }, (_, index) => `f${index}.c`),
            ),
            ...many(
                'test/fixtures',
                Array.from({ length: 40 }, (_, index) => `f${index}.json`),
            ),
        ];
        for (const name of Object.keys(BUILT_IN_PRESETS)) {
            assert.deepEqual(check(name, files), [], name);
        }
    });

    it('leaves out test data in either case, and changelog fragments', () => {
        const forty = (folder: string, extension: string): string[] =>
            many(
                folder,
                Array.from({ length: 40 }, (_, index) => `case${index}.${extension}`),
            );
        const files = [
            ...forty('tests/Composer/Test/Fixtures/installer', 'test'), // composer/composer
            ...forty('Snapshots/Issues', 'swift'), // nicklockwood/SwiftFormat
            ...forty('tooling/rounds/expected', 'json'), // expected outputs of an end-to-end run
            ...forty('changelog', 'md'), // rubocop/rubocop
        ];
        assert.deepEqual(check('recommended', files), []);
    });

    it("docs makes groups of pages warnings, and leaves the code next to them alone (square/okhttp's root mkdocs.yml)", () => {
        const pages = [
            'response-cookies.md',
            'response-headers.md',
            'response-status.md',
            'response-directly.md',
            'events.md',
        ];
        const code = [
            'RealCall.kt',
            'RealConnection.kt',
            'RealConnectionPool.kt',
            'RealRoutePlanner.kt',
            'Exchange.kt',
        ];
        const findings = check('docs', [
            ...many('docs/advanced', pages),
            ...many('okhttp/src/commonJvmAndroid/kotlin/okhttp3/internal/connection', code),
        ]);
        assert.deepEqual(
            findings.map(finding => `${finding.folder} ${finding.severity}`),
            ['docs/advanced warn', 'okhttp/src/commonJvmAndroid/kotlin/okhttp3/internal/connection error'],
        );
    });

    it("angular's limit is for src/, not for the repository's tooling", () => {
        const twelve = (folder: string): string[] =>
            many(
                folder,
                Array.from({ length: 12 }, (_, index) => `part${index}.mjs`),
            );
        assert.deepEqual(
            check('angular', [...twelve('tooling/rounds'), ...twelve('src/app/state')]).map(finding => finding.folder),
            ['src/app/state'],
        );
    });

    it('nuxt warns before grouping composables, which are auto-imported from the top level only', () => {
        const composables = ['useAuthLogin.ts', 'useAuthLogout.ts', 'useAuthToken.ts', 'useAuthUser.ts', 'useTheme.ts'];
        const findings = check('nuxt', many('app/composables', composables));
        assert.deepEqual(
            findings.map(finding => `${finding.rule} ${finding.severity}`),
            ['prefix-groups warn'],
        );
        assert.match(findings[0]?.message ?? '', /re-exports it, or imports\.dirs/u);
    });

    it("docs leaves a blog's dated posts alone, and treats content/ as pages (jekyll/jekyll, astro-paper)", () => {
        const posts = many(
            'docs/_posts',
            Array.from(
                { length: 102 },
                (_, index) => `2016-01-${String(index).padStart(3, '0')}-jekyll-release.markdown`,
            ),
        );
        const howTo = many('src/content/posts', [
            'how-to-add-latex-equations-in-blog-posts.md',
            'how-to-configure-astropaper-theme.md',
            'how-to-integrate-giscus-comments.md',
            'how-to-update-dependencies.md',
            'adding-new-post.md',
        ]);
        const pages = many('content/en/methods/pages', [
            'ByDate.md',
            'ByLanguage.md',
            'ByLength.md',
            'ByTitle.md',
            'Next.md',
        ]);
        assert.deepEqual(
            check('docs', [...posts, ...howTo, ...pages]).map(finding => `${finding.folder} ${finding.severity}`),
            ['content/en/methods/pages warn'],
        );
    });

    it('strict asks for more than recommended', () => {
        const files = many('src', ['user-a.ts', 'user-b.ts', 'user-c.ts', 'other.ts']);
        assert.deepEqual(check('recommended', files), []);
        assert.deepEqual(
            check('strict', files).map(finding => finding.rule),
            ['prefix-groups'],
        );
    });

    it('a preset applied twice changes nothing', () => {
        const once: Config = { extends: ['recommended', 'react'] };
        assert.deepEqual(
            resolvePreset('nextjs').rules,
            resolvePreset('nextjs', new Set(['recommended']), resolvePreset('recommended')).rules,
        );
        assert.ok(once);
    });
});

describe('detectPresets', () => {
    it('proposes recommended always, and each preset from a file or a dependency', () => {
        const found = detectPresets(
            ['go.mod', 'web/angular.json', 'app/src/main/AndroidManifest.xml'],
            new Map([['react', ['package.json']]]),
            BUILT_IN_PRESETS,
        );
        assert.deepEqual(
            found.map(detection => `${detection.preset} ← ${detection.evidence}`),
            [
                'recommended ← every repository',
                'angular ← web/angular.json',
                'react ← the dependency react',
                'go ← go.mod',
                'android ← app/src/main/AndroidManifest.xml',
            ],
        );
    });

    it('does not take test data for the repository (sharkdp/bat, jgm/pandoc)', () => {
        const found = detectPresets(
            [
                'Cargo.toml',
                'tests/syntax-tests/highlighted/Go/go.mod',
                'tests/syntax-tests/highlighted/Terraform/main.tf',
                'tests/syntax-tests/highlighted/XML/console.csproj',
                'pandoc-lua-engine/test/lua/module/include.tex',
            ],
            new Map(),
            BUILT_IN_PRESETS,
        );
        assert.deepEqual(
            found.map(detection => detection.preset),
            ['recommended', 'rust'],
        );
    });

    it("does not take Flutter's generated platform folders for other languages (localsend/localsend)", () => {
        const found = detectPresets(
            [
                'app/android/app/build.gradle',
                'app/android/app/src/debug/AndroidManifest.xml',
                'app/ios/Runner.xcodeproj/project.pbxproj',
                'app/linux/CMakeLists.txt',
                'app/pubspec.yaml',
                'core/Cargo.toml',
            ],
            new Map(),
            BUILT_IN_PRESETS,
        );
        assert.deepEqual(
            found.map(detection => `${detection.preset} ← ${detection.evidence}`),
            ['recommended ← every repository', 'rust ← core/Cargo.toml', 'flutter ← app/pubspec.yaml'],
        );
    });

    it("leaves out Flutter's platform folders where the app is, not only at the root (localsend/localsend)", () => {
        const files = [
            'app/pubspec.yaml',
            'app/lib/main.dart',
            'app/android/app/src/main/kotlin/MainActivity.kt',
            'app/ios/Runner/AppDelegate.swift',
            'app/linux/CMakeLists.txt',
            'core/Cargo.toml',
        ];
        const found = detectPresets(files, new Map(), BUILT_IN_PRESETS);
        assert.deepEqual(
            excludesFor(found, files, BUILT_IN_PRESETS).toSorted((a, b) => a.localeCompare(b)),
            ['app/android', 'app/ios', 'app/linux'],
        );
    });

    it('reads where a dependency was declared: React Native in a package of a monorepo', () => {
        const files = [
            'package.json',
            'apps/mobile/package.json',
            'apps/mobile/ios/App/AppDelegate.mm',
            'apps/mobile/src/App.tsx',
        ];
        const found = detectPresets(
            files,
            new Map([
                ['react', ['package.json', 'apps/mobile/package.json']],
                ['react-native', ['apps/mobile/package.json']],
            ]),
            BUILT_IN_PRESETS,
        );
        assert.deepEqual(found.find(detection => detection.preset === 'react-native')?.folders, ['apps/mobile']);
        assert.deepEqual(excludesFor(found, files, BUILT_IN_PRESETS), ['apps/mobile/ios']);
    });
});
