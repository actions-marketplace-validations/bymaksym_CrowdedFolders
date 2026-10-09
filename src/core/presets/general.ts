import type { Preset } from '../config/types.ts';

/**
 * Images, sound, video and fonts. A folder of 300 icons is a set, not a drawer: crowding is about
 * code and documents. The game presets put them back, because there the assets are the project.
 */
export const MEDIA =
    '*.{png,jpg,jpeg,gif,svg,webp,avif,ico,icns,bmp,tif,tiff,psd,xcf,exr,hdr,mp3,wav,ogg,flac,m4a,aac,mp4,webm,mov,avi,mkv,ttf,otf,woff,woff2,eot,pdf}';

/**
 * Folders of test data: fixtures, snapshots, golden and expected outputs. Their shape is the thing
 * under test, so they are not arranged, and a manifest inside one says nothing about the repository.
 */
export const TEST_DATA: readonly string[] = [
    '*[fF]ixtures',
    '__fixtures__',
    '__snapshots__',
    '[sS]napshots',
    '[sS]creenshots',
    '[gG]oldens',
    '[eE]xpected',
    '[tT]est[dD]ata',
    '__mocks__',
];

/**
 * What every repository gets, whatever its language: the two rules that make the tool, at limits
 * measured on real repositories (see docs/presets.md), and the folders that are never yours to
 * arrange.
 */
export const recommended: Preset = {
    description:
        'The two rules that matter, at limits measured on real repositories: at most 20 modules in a folder (a module is a file with its companions: foo.ts, foo.spec.ts and foo.html are one), and 4 modules sharing a first word make a folder. Leaves out vendored, generated and test-data folders, changelog fragments, media, translations and the folders of tools (.github).',
    sources: [
        {
            title: 'Angular style guide: "consider splitting further"',
            url: 'https://angular.dev/style-guide#project-structure',
        },
        {
            title: 'docs/presets.md: how the limits were measured',
            url: 'https://github.com/bymaksym/CrowdedFolders/blob/main/docs/presets.md',
        },
    ],
    config: {
        exclude: [
            // Someone else's code, kept byte for byte.
            'node_modules',
            'vendor',
            'third_party',
            'third-party',
            // Test data: its shape is the thing under test, or the tool that produced it. Either case:
            // PHP, Java, C# and Swift write Fixtures/, Snapshots/ and TestData/.
            ...TEST_DATA,
            // Changelog fragments: one file per merged change, collected and deleted at release
            // (rubocop's changelog/, towncrier's newsfragments/, scriv's changelog.d/).
            'changelog',
            'changelog.d',
            'changelog_unreleased',
            'newsfragments',
            // Folders whose name starts with a dot belong to the tool that reads them (.github,
            // .changeset, .vscode), and their layout is that tool's: GitHub, for one, only reads
            // workflows directly inside .github/workflows.
            '.*',
            MEDIA,
            // Migrations: flat and ordered by number or date in every tool that writes them, and
            // the remedy for too many is squashing, not folders.
            'migrations',
            'migrate',
            '**/alembic/versions',
            '**/db/migration',
            // Generated, when it is committed anyway, or found by walking the disk without git.
            'dist',
            'coverage',
            '__pycache__',
            '.git',
        ],
        naming: {
            groupNumericPrefixes: false,
        },
        rules: {
            // 20 modules is about the 95th percentile of folder sizes measured over 30 repositories of
            // every ecosystem (docs/presets.md): it flags the biggest folder in twenty.
            'max-files': ['error', { max: 20, count: 'modules', dotfiles: false }],
            // Words that say nothing about what a file is about are not groups: test markers, and
            // the accessors and predicates of every language (GetAlbum, IsPlayed, HasSeries).
            'prefix-groups': [
                'error',
                { min: 4, words: 1, ignore: ['test', 'tests', 'spec', 'get', 'set', 'is', 'has', 'can', 'should'] },
            ],
            'max-folders': 'off',
            'redundant-prefix': 'off',
            'single-file-folders': 'off',
        },
        overrides: [
            {
                folders: [
                    '**/locales',
                    '**/locale',
                    '**/i18n',
                    '**/l10n',
                    '**/translations',
                    '**/lang',
                    '**/langs',
                    '**/Localization',
                    '**/Localization/**',
                ],
                reason: 'Translations are one file per language, side by side by nature: en, en-GB and en-US are not a group to move.',
                rules: { 'max-files': 'off', 'prefix-groups': 'off' },
            },
            {
                folders: ['.'],
                reason: 'The root holds what tools look for there on their own: manifests, lockfiles, licences, configs.',
                rules: { 'max-files': ['error', { max: 40 }] },
            },
        ],
    },
};

/** For a team that wants a tidier tree than the measured median, and to keep it that way. */
export const strict: Preset = {
    description:
        "Tighter than recommended: at most 12 modules in a folder, 3 modules sharing a prefix make a folder, at most 20 subfolders, no module repeating its folder's name, and no folder holding a single file. An opinion, not a measurement: use it when you want the tree tidier than most.",
    sources: [
        {
            title: 'Angular style guide (former LIFT "Flat" rule: sub-folders at seven or more files)',
            url: 'https://github.com/kenny-chow-my/AngularStyleGuide',
        },
    ],
    config: {
        extends: ['recommended'],
        rules: {
            'max-files': ['error', { max: 12, count: 'modules' }],
            'prefix-groups': ['error', { min: 3 }],
            'max-folders': ['error', { max: 20 }],
            'redundant-prefix': 'error',
            'single-file-folders': 'warn',
        },
    },
};
