import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { isObject } from '../core/config/json-schema.ts';

/**
 * Finds a package or file named in a configuration (`plugins`, `extends`) the way a user expects:
 * from the configuration's folder, not from wherever this package happens to be installed. A plugin
 * installed next to the user's project has to be found even when the command runs through `npx`.
 */
export function resolveSpecifier(specifier: string, fromDir: string): string {
    if (specifier.startsWith('.') || isAbsolute(specifier)) {
        const path = resolve(fromDir, specifier);
        if (!existsSync(path)) {
            throw new Error(`"${specifier}" does not exist (looked for ${path})`);
        }
        return path;
    }
    const { name, subpath } = splitPackage(specifier);
    for (let dir = fromDir; ; dir = dirname(dir)) {
        const packageDir = join(dir, 'node_modules', name);
        const manifest = join(packageDir, 'package.json');
        if (existsSync(manifest)) {
            return entryOf(packageDir, JSON.parse(readFileSync(manifest, 'utf8')) as unknown, subpath, specifier);
        }
        if (dirname(dir) === dir) {
            break;
        }
    }
    throw new Error(
        `the package "${name}" is not installed where the configuration is (from ${fromDir}): install it as a devDependency`,
    );
}

/** Imports a module by path and returns its default export (or the module itself without one). */
export async function importDefault(path: string): Promise<unknown> {
    const module = (await import(pathToFileURL(path).href)) as Record<string, unknown>;
    return 'default' in module ? module['default'] : module;
}

function splitPackage(specifier: string): { name: string; subpath: string } {
    const parts = specifier.split('/');
    const length = specifier.startsWith('@') ? 2 : 1;
    const subpath = parts.slice(length).join('/');
    return { name: parts.slice(0, length).join('/'), subpath: subpath === '' ? '.' : `./${subpath}` };
}

/** Reads `exports` (the `import`, `node` or `default` condition), then `main`, then `index.js`. */
function entryOf(packageDir: string, manifest: unknown, subpath: string, specifier: string): string {
    if (!isObject(manifest)) {
        throw new Error(`"${specifier}" has a package.json that is not an object`);
    }
    const exportsField = manifest['exports'];
    if (exportsField !== undefined) {
        const target = exportTarget(exportsField, subpath);
        if (target === undefined) {
            throw new Error(`"${specifier}" does not export "${subpath}" in its package.json`);
        }
        return join(packageDir, target);
    }
    if (subpath !== '.') {
        return join(packageDir, subpath);
    }
    const main = typeof manifest['main'] === 'string' ? manifest['main'] : 'index.js';
    const path = join(packageDir, main);
    return existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.js') : path;
}

function exportTarget(field: unknown, subpath: string): string | undefined {
    if (typeof field === 'string') {
        return subpath === '.' ? field : undefined;
    }
    if (Array.isArray(field)) {
        for (const option of field) {
            const target = exportTarget(option, subpath);
            if (target !== undefined) {
                return target;
            }
        }
        return undefined;
    }
    if (!isObject(field)) {
        return undefined;
    }
    const keys = Object.keys(field);
    if (keys.some(key => key.startsWith('.'))) {
        const entry = field[subpath];
        return entry === undefined ? undefined : conditionTarget(entry);
    }
    return subpath === '.' ? conditionTarget(field) : undefined;
}

function conditionTarget(entry: unknown): string | undefined {
    if (typeof entry === 'string') {
        return entry;
    }
    if (Array.isArray(entry)) {
        for (const option of entry) {
            const target = conditionTarget(option);
            if (target !== undefined) {
                return target;
            }
        }
        return undefined;
    }
    if (!isObject(entry)) {
        return undefined;
    }
    for (const condition of ['import', 'node', 'default']) {
        if (entry[condition] === undefined) {
            continue;
        }

        const target = conditionTarget(entry[condition]);
        if (target !== undefined) {
            return target;
        }
    }
    return undefined;
}
