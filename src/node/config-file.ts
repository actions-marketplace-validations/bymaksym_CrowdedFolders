import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

import { isObject } from '../core/config/json-schema.ts';
import { parseJsonc } from '../core/config/jsonc.ts';
import { importDefault } from './modules.ts';

/** The names a configuration can have, in the order they are looked for in each folder. */
export const CONFIG_NAMES = [
    'crowded-folders.config.json',
    'crowded-folders.config.jsonc',
    'crowded-folders.config.mjs',
    'crowded-folders.config.js',
    '.config/crowded-folders.json',
    '.config/crowded-folders.jsonc',
    '.config/crowded-folders.mjs',
] as const;

export const PACKAGE_KEY = 'crowded-folders';

export interface FoundConfig {
    /** The file that holds it: a configuration file, or a package.json with a "crowded-folders" key. */
    readonly path: string;
    /** The folder it describes: where it is, or above `.config/`. Relative paths in it start here. */
    readonly projectDir: string;
}

/**
 * Looks for a configuration from `startDir` upwards, stopping at the top of the git repository (or
 * of the disk). Two configurations in one folder is an error rather than a choice: one would be
 * read and the other silently ignored.
 */
export function findConfig(startDir: string): FoundConfig | undefined {
    for (let dir = startDir; ; dir = dirname(dir)) {
        const found = CONFIG_NAMES.map(name => join(dir, name)).filter(path => existsSync(path));
        const manifest = join(dir, 'package.json');
        if (existsSync(manifest) && hasPackageKey(manifest)) {
            found.push(manifest);
        }
        if (found.length > 1) {
            throw new Error(
                `${dir} has more than one crowded-folders configuration (${found.map(path => basename(path)).join(', ')}): keep one, so it is clear which is read.`,
            );
        }
        const [path] = found;
        if (path !== undefined) {
            return { path, projectDir: projectDirOf(path) };
        }
        if (existsSync(join(dir, '.git')) || dirname(dir) === dir) {
            return undefined;
        }
    }
}

export function projectDirOf(path: string): string {
    const dir = dirname(path);
    return basename(dir) === '.config' ? dirname(dir) : dir;
}

/** Reads a configuration file of any supported kind and returns what it holds, not yet checked. */
export async function readConfigFile(path: string): Promise<unknown> {
    if (basename(path) === 'package.json') {
        const manifest = parseJsonc(readFileSync(path, 'utf8'));
        return isObject(manifest) ? manifest[PACKAGE_KEY] : undefined;
    }
    const extension = extname(path);
    if (extension === '.json' || extension === '.jsonc') {
        try {
            return parseJsonc(readFileSync(path, 'utf8'));
        } catch (error) {
            throw new Error(`${path} is not valid JSON: ${(error as Error).message}`, { cause: error });
        }
    }
    const value = await importDefault(path);
    return typeof value === 'function' ? await (value as () => unknown)() : value;
}

/**
 * The top of the git repository that holds `dir`, or `undefined` outside one. Read from the disk, without running git.
 */
export function gitRootOf(dir: string): string | undefined {
    for (let current = dir; ; current = dirname(current)) {
        if (existsSync(join(current, '.git'))) {
            return current;
        }
        if (dirname(current) === current) {
            return undefined;
        }
    }
}

function hasPackageKey(manifest: string): boolean {
    try {
        const value = parseJsonc(readFileSync(manifest, 'utf8'));
        return isObject(value) && value[PACKAGE_KEY] !== undefined;
    } catch {
        return false;
    }
}
