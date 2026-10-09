// @ts-check
/**
 * The field trial: runs crowded-folders over public repositories of every ecosystem it has a preset
 * for, and measures how big folders really are. It is how the limits of the presets were chosen,
 * and how a change to them is judged: a limit that flags half the folders of well-kept projects is
 * noise, one that flags none catches nothing.
 *
 * Only the list of file names is downloaded (a shallow clone without blobs, read with
 * `git ls-tree`), so even a large repository costs a few megabytes. Lists are cached in
 * .field-trial/ (git-ignored); --refresh downloads them again.
 *
 * Usage:  pnpm run build && node tooling/field-trial.mjs [--refresh] [--only name,name] [--docs]
 * Output: a summary on stdout, .field-trial/results.json, and with --docs docs/field-trial.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

/** @typedef {{ repo: string, presets: string[], kind: string }} Trial */

/** @type {Trial[]} */
export const TRIALS = [
    // Web
    { repo: 'angular/components', presets: ['angular'], kind: 'Angular library' },
    { repo: 'excalidraw/excalidraw', presets: ['react'], kind: 'React app' },
    { repo: 'shadcn-ui/taxonomy', presets: ['nextjs'], kind: 'Next.js app' },
    { repo: 'elk-zone/elk', presets: ['vue'], kind: 'Nuxt app' },
    { repo: 'sveltejs/kit', presets: ['svelte'], kind: 'SvelteKit' },
    { repo: 'brocoders/nestjs-boilerplate', presets: ['nestjs'], kind: 'NestJS app' },
    // Languages
    { repo: 'encode/httpx', presets: ['python'], kind: 'Python library' },
    { repo: 'zulip/zulip', presets: ['django'], kind: 'Django app' },
    { repo: 'gin-gonic/gin', presets: ['go'], kind: 'Go library' },
    { repo: 'gohugoio/hugo', presets: ['go'], kind: 'Go application' },
    { repo: 'BurntSushi/ripgrep', presets: ['rust'], kind: 'Rust CLI' },
    { repo: 'tokio-rs/axum', presets: ['rust'], kind: 'Rust library' },
    { repo: 'spring-projects/spring-petclinic', presets: ['java'], kind: 'Spring app' },
    { repo: 'android/nowinandroid', presets: ['android'], kind: 'Android app' },
    { repo: 'dotnet/eShop', presets: ['dotnet'], kind: '.NET app' },
    { repo: 'jellyfin/jellyfin', presets: ['dotnet'], kind: '.NET server' },
    { repo: 'Alamofire/Alamofire', presets: ['swift'], kind: 'Swift library' },
    {
        repo: 'immich-app/immich',
        presets: ['flutter', 'nestjs', 'svelte'],
        kind: 'Monorepo: Flutter, NestJS, SvelteKit',
    },
    { repo: 'mastodon/mastodon', presets: ['rails', 'react'], kind: 'Rails app' },
    { repo: 'koel/koel', presets: ['php', 'vue'], kind: 'Laravel app' },
    { repo: 'redis/redis', presets: ['c-cpp'], kind: 'C server' },
    { repo: 'git/git', presets: ['c-cpp'], kind: 'C tool' },
    // Games
    { repo: 'UnityTechnologies/open-project-1', presets: ['unity'], kind: 'Unity game' },
    { repo: 'tomlooman/ActionRoguelike', presets: ['unreal'], kind: 'Unreal game' },
    { repo: 'godotengine/godot-demo-projects', presets: ['godot'], kind: 'Godot demos' },
    { repo: 'godotengine/godot', presets: ['c-cpp'], kind: 'C++ engine' },
    // Infrastructure, documents, data
    { repo: 'terraform-aws-modules/terraform-aws-eks', presets: ['terraform'], kind: 'Terraform module' },
    { repo: 'facebook/docusaurus', presets: ['docs', 'react'], kind: 'Docs site and tool' },
    { repo: 'fastai/fastbook', presets: ['data-science'], kind: 'Notebooks' },
    { repo: 'exacity/deeplearningbook-chinese', presets: ['latex'], kind: 'LaTeX book' },
];

const { values } = parseArgs({
    options: { refresh: { type: 'boolean' }, only: { type: 'string' }, docs: { type: 'boolean' } },
});

const cache = join(process.cwd(), '.field-trial');
mkdirSync(join(cache, 'lists'), { recursive: true });

// The built package, imported by a computed path: dist/ only exists after a build, and the types
// come from src/, so the type check passes on a clean checkout too.
const dist = new URL('../dist/', import.meta.url).href;
const { lint, BUILT_IN_PRESETS, modulesOf, mergeLayer } = /** @type {typeof import('../src/index.ts')} */ (
    await import(`${dist}index.js`)
);

/** @param {Trial} trial */
function fileList(trial) {
    const id = trial.repo.replace('/', '__');
    const listPath = join(cache, 'lists', `${id}.txt`);
    const metaPath = join(cache, 'lists', `${id}.commit`);
    if (!values.refresh && existsSync(listPath)) {
        return {
            files: readFileSync(listPath, 'utf8').split('\n').filter(Boolean),
            commit: readFileSync(metaPath, 'utf8').trim(),
        };
    }
    const dir = join(cache, 'clones', id);
    rmSync(dir, { recursive: true, force: true });
    execFileSync(
        'git',
        [
            'clone',
            '--quiet',
            '--depth',
            '1',
            '--filter=blob:none',
            '--no-checkout',
            `https://github.com/${trial.repo}.git`,
            dir,
        ],
        {
            stdio: 'inherit',
        },
    );
    const files = execFileSync('git', ['-C', dir, 'ls-tree', '-r', '--name-only', 'HEAD'], {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
    })
        .split('\n')
        .filter(Boolean);
    const commit = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    writeFileSync(listPath, files.join('\n'));
    writeFileSync(metaPath, commit);
    rmSync(dir, { recursive: true, force: true });
    return { files, commit };
}

/** @param {number[]} values @param {number} p */
const percentile = (values, p) => {
    if (values.length === 0) return 0;
    const sorted = values.toSorted((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
};

const only = values.only?.split(',');
const results = [];
const chosen = TRIALS.filter(t => !only || only.some(name => t.repo.includes(name)));
for (const trial of chosen) {
    let list;
    try {
        list = fileList(trial);
    } catch (error) {
        console.error(`${trial.repo}: could not be listed (${/** @type {Error} */ (error).message.split('\n', 1)[0]})`);
        continue;
    }
    const presets = ['recommended', ...trial.presets];
    const withPresets = await lint({ root: cache, files: list.files, config: { extends: presets } });
    const plain = await lint({ root: cache, files: list.files, config: { extends: ['recommended'] } });

    // Folder sizes, after recommended's exclusions, in files and in modules.
    const { selectFiles } = /** @type {typeof import('../src/core/engine.ts')} */ (
        await import(`${dist}core/engine.js`)
    );
    const { buildTree } = /** @type {typeof import('../src/core/paths/tree.ts')} */ (
        await import(`${dist}core/paths/tree.js`)
    );
    const recommended = mergeLayer(
        {
            include: [],
            exclude: [],
            naming: { companions: [], ignoreLeadingWords: [], groupNumericPrefixes: false },
            rules: {},
            overrides: [],
            layers: [],
            suppressions: undefined,
        },
        BUILT_IN_PRESETS.recommended.config,
        'recommended',
        false,
    );
    const tree = buildTree(selectFiles(list.files, recommended)).filter(folder => folder.files.length > 0);
    const naming = { companions: [], ignoreLeadingWords: new Set(), groupNumericPrefixes: false };
    const files = tree.map(folder => folder.files.filter(name => !name.startsWith('.')).length);
    const modules = tree.map(folder => modulesOf(folder.files, naming).length);

    const count = (/** @type {readonly import('../src/index.ts').Finding[]} */ findings, /** @type {string} */ rule) =>
        findings.filter(finding => finding.rule === rule).length;
    results.push({
        repo: trial.repo,
        kind: trial.kind,
        commit: list.commit,
        presets,
        files: list.files.length,
        folders: tree.length,
        sizes: {
            files: {
                p50: percentile(files, 50),
                p90: percentile(files, 90),
                p95: percentile(files, 95),
                p99: percentile(files, 99),
                max: Math.max(0, ...files),
            },
            modules: {
                p50: percentile(modules, 50),
                p90: percentile(modules, 90),
                p95: percentile(modules, 95),
                p99: percentile(modules, 99),
                max: Math.max(0, ...modules),
            },
        },
        recommended: {
            maxFiles: count(plain.findings, 'max-files'),
            prefixGroups: count(plain.findings, 'prefix-groups'),
        },
        presetsResult: {
            errors: withPresets.findings.filter(finding => finding.severity === 'error').length,
            warnings: withPresets.findings.filter(finding => finding.severity === 'warn').length,
            maxFiles: count(withPresets.findings, 'max-files'),
            prefixGroups: count(withPresets.findings, 'prefix-groups'),
        },
        samples: withPresets.findings.slice(0, 400).map(finding => ({
            rule: finding.rule,
            severity: finding.severity,
            folder: finding.folder,
            message: finding.message,
        })),
    });
    const last = results.at(-1);
    console.log(
        `${trial.repo.padEnd(40)} ${String(last?.folders).padStart(6)} folders  files p50/p90/p99 ${last?.sizes.files.p50}/${last?.sizes.files.p90}/${last?.sizes.files.p99}  ` +
            `recommended ${last?.recommended.maxFiles}+${last?.recommended.prefixGroups}  presets ${last?.presetsResult.errors}e/${last?.presetsResult.warnings}w`,
    );
}
writeFileSync(join(cache, 'results.json'), `${JSON.stringify(results, undefined, 2)}\n`);
console.log(`\n${results.length} repositories. Details: .field-trial/results.json`);

if (values.docs) {
    writeFileSync(join(process.cwd(), 'docs', 'field-trial.md'), fieldTrialPage(results));
    console.log('Wrote docs/field-trial.md');
}

/**
 * The page that says where the numbers of the presets come from.
 *
 * @param {typeof results} rows
 */
function fieldTrialPage(rows) {
    const all = rows.map(row => row.sizes.modules.p95);
    const median = percentile(all, 50);
    const lines = [
        '<!-- Written by tooling/field-trial.mjs --docs. Do not edit: run it again. -->',
        '',
        '# The field trial',
        '',
        `crowded-folders was run over ${rows.length} public repositories, one or more per preset, to choose its limits`,
        'and to find what it reports that it should not. Only the list of file names was downloaded',
        '(`git ls-tree` on a clone without blobs); the commit of each is below, so the trial can be repeated.',
        '',
        '**How to read it.** A folder is measured after `recommended` leaves out what is not yours to arrange',
        '(vendored code, test data, media, translations, tool folders). A *module* is a file with its',
        'companions (`foo.ts`, `foo.spec.ts`, `foo.html` are one). p50/p90/p95/p99 are percentiles of modules',
        'per folder; the last two columns count the problems found with `recommended` alone and with the',
        "repository's own presets.",
        '',
        `**What it decided.** Across these repositories the median 95th percentile is ${median} modules: a limit of`,
        '20 flags about the biggest folder in twenty in a typical project, and none at all in small, tidy ones',
        '(ripgrep, httpx, axum). Projects that keep large flat folders on purpose (git, redis, the Godot engine)',
        'show up as many problems, which is what suppressions are for.',
        '',
        '| Repository | Kind | Presets | Folders | Modules p50/p90/p95/p99 | Largest | recommended | With its presets |',
        '| --- | --- | --- | ---: | --- | ---: | --- | --- |',
    ];
    for (const row of rows) {
        const m = row.sizes.modules;
        lines.push(
            `| [${row.repo}](https://github.com/${row.repo}/tree/${row.commit}) | ${row.kind} | ${row.presets.slice(1).join(', ')} | ${row.folders} | ${m.p50}/${m.p90}/${m.p95}/${m.p99} | ${m.max} | ` +
                `${row.recommended.maxFiles} max-files, ${row.recommended.prefixGroups} prefix-groups | ${row.presetsResult.errors} errors, ${row.presetsResult.warnings} warnings |`,
        );
    }
    lines.push(
        '',
        '## What the trial changed',
        '',
        'Each of these was a false positive in an earlier run, and is now a rule of the tool:',
        '',
        '- **Media, translations, test data and tool folders are left out by `recommended`.** A folder of icons,',
        '  a `locales/` folder with one file per language, `__snapshots__`, screenshot goldens and',
        '  `.github/workflows` (GitHub does not read sub-folders there) are crowded by design, not by neglect.',
        '- **A group that repeats the name of its folder, or of a folder above it, is not reported.**',
        '  `ColorPicker/ColorInput`, `drag-drop/drag-handle` and `BardHare/BardHare_Idle` are already where',
        '  they belong.',
        '- **A group that is the whole folder is not reported**: moving everything one level down only adds a',
        '  level.',
        '- **Accessor and predicate words do not make groups**: `GetAlbumController`, `IsPlayedComparer` and',
        '  `HasSeries` are not about "get", "is" or "has".',
        '- **Limits count modules, not files**, so an Angular component (four files) weighs what a Go file does.',
        '',
        'To repeat it: `pnpm run build && node tooling/field-trial.mjs --docs`.',
    );
    return `${lines.join('\n')}\n`;
}
