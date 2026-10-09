import type { Preset } from '../config/types.ts';
import { compileGlob, type Glob, matchesSelfOrAncestor } from '../paths/glob.ts';
import { parentOf } from '../paths/tree.ts';
import { TEST_DATA } from './general.ts';

export interface Detection {
    readonly preset: string;
    /** What gave it away: a file path or a dependency name. */
    readonly evidence: string;
    /** Every folder it was found in (`.` for the root): where its root-anchored excludes apply. */
    readonly folders: readonly string[];
}

/**
 * Folders whose files say nothing about what the repository is: tests and their data, examples,
 * playgrounds and the templates a scaffolder copies. bat's tests/syntax-tests hold a go.mod and a
 * main.tf to highlight; vite's playground and create-vite templates depend on react, vue and svelte.
 */
const NOT_EVIDENCE: readonly Glob[] = [
    ...TEST_DATA,
    'node_modules',
    'vendor',
    'third_party',
    'test',
    'tests',
    '__tests__',
    'example',
    'examples',
    'playground',
    'playgrounds',
    'template',
    'templates',
    'template-*',
].map(compileGlob);

/** Whether a file can tell which presets fit: it is not inside tests, examples or templates. */
export function isEvidence(path: string): boolean {
    return !matchesSelfOrAncestor(parentOf(path), NOT_EVIDENCE);
}

/**
 * Which presets fit a repository, from its file paths and the dependencies its package.json files
 * declare (each with the manifests that declare it). `recommended` always comes first; the rest in
 * the order of `presets`.
 *
 * A file is evidence only outside tests, examples and templates, and outside the folders another
 * detected preset leaves out, read from where that preset was found: Flutter's `/linux` next to
 * `app/pubspec.yaml` is `app/linux`, and the CMakeLists.txt Flutter generates there is not C++.
 */
export function detectPresets(
    files: readonly string[],
    dependencies: ReadonlyMap<string, readonly string[]>,
    presets: Readonly<Record<string, Preset>>,
): Detection[] {
    const candidates = files.filter(path => isEvidence(path)).toSorted((a, b) => depthOf(a) - depthOf(b));
    const found: { readonly preset: string; readonly evidence: string; readonly files: readonly string[] }[] = [];
    for (const [name, preset] of Object.entries(presets)) {
        const detect = preset.detect;
        if (!detect || name === 'recommended') {
            continue;
        }
        const dependency = detect.dependencies?.find(candidate => dependencies.has(candidate));
        if (dependency !== undefined) {
            const manifests = detect.dependencies?.flatMap(candidate => dependencies.get(candidate) ?? []) ?? [];
            found.push({ preset: name, evidence: `the dependency ${dependency}`, files: manifests });
            continue;
        }
        const globs = (detect.files ?? []).map(compileGlob);
        const matching = globs.length === 0 ? [] : candidates.filter(path => globs.some(glob => glob.test(path)));
        if (matching.length > 0) {
            found.push({ preset: name, evidence: matching[0] ?? '', files: matching });
        }
    }

    const detections: Detection[] = [{ preset: 'recommended', evidence: 'every repository', folders: ['.'] }];
    for (const detection of found) {
        const leftOut = found
            .filter(other => other !== detection)
            .flatMap(other => other.files.flatMap(file => anchoredExcludes(other.preset, presets, parentOf(file))));
        const evidence = detection.files.filter(file => !matchesSelfOrAncestor(parentOf(file), leftOut));
        // Every file that gave it away is inside what another preset leaves out.
        if (detection.files.length > 0 && evidence.length === 0) {
            continue;
        }
        const folders = [...new Set((evidence.length > 0 ? evidence : ['package.json']).map(file => parentOf(file)))];
        detections.push({
            preset: detection.preset,
            evidence: detection.evidence.startsWith('the dependency ') ? detection.evidence : (evidence[0] ?? ''),
            folders,
        });
    }
    return detections;
}

/**
 * The excludes a detected preset needs that its own patterns cannot say: its root-anchored ones
 * (`/android`, `/ios`), read from each folder it was found in other than the root, and kept only
 * when they leave some file out. localsend's Flutter app is in app/, so `/android` is `app/android`.
 */
export function excludesFor(
    detections: readonly Detection[],
    files: readonly string[],
    presets: Readonly<Record<string, Preset>>,
): string[] {
    const excludes = new Set<string>();
    for (const detection of detections) {
        for (const folder of detection.folders) {
            if (folder === '.') {
                continue;
            }
            for (const pattern of anchoredPatterns(detection.preset, presets)) {
                const rebased = `${folder}/${pattern}`;
                const glob = compileGlob(rebased);
                if (files.some(file => matchesSelfOrAncestor(file, [glob]))) {
                    excludes.add(rebased);
                }
            }
        }
    }
    return [...excludes];
}

/** A preset's root-anchored excludes, from it and what it extends, without the leading slash. */
function anchoredPatterns(name: string, presets: Readonly<Record<string, Preset>>): string[] {
    const seen = new Set<string>();
    const collect = (current: string): string[] => {
        const preset = presets[current];
        if (!preset || seen.has(current)) {
            return [];
        }
        seen.add(current);
        const own = (preset.config.exclude ?? [])
            .filter(pattern => pattern.startsWith('/') || pattern.includes('/'))
            .map(pattern => pattern.replace(/^\.?\//u, ''))
            // `**/lib/l10n` already matches at any depth.
            .filter(pattern => !pattern.startsWith('**/'));
        return [...own, ...(preset.config.extends ?? []).flatMap(parent => collect(parent))];
    };
    return collect(name);
}

/** A preset's root-anchored excludes as globs, read from the folder it was found in. */
function anchoredExcludes(name: string, presets: Readonly<Record<string, Preset>>, base: string): Glob[] {
    return anchoredPatterns(name, presets).map(pattern =>
        compileGlob(base === '.' ? `/${pattern}` : `${base}/${pattern}`),
    );
}

function depthOf(path: string): number {
    return path.split('/').length;
}
