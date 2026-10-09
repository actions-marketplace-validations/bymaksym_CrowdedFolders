import { compareText } from '../naming/modules.ts';

/** One folder of the repository as the rules see it: names only, sorted. */
export interface FolderEntry {
    /** Relative to the root, `/`-separated; the root itself is `.`. */
    readonly path: string;
    /** The last segment; for the root, `.`. */
    readonly name: string;
    /** How many folders down from the root: the root is 0. */
    readonly depth: number;
    readonly files: readonly string[];
    readonly folders: readonly string[];
}

/**
 * Normalises a path given by git, the file system or a user: `/` separators, no `./`, no leading or
 * trailing slash. Returns `undefined` for a path that leaves the root (`../x`) or is empty.
 */
export function normalisePath(path: string): string | undefined {
    const segments: string[] = [];
    for (const segment of path.replaceAll('\\', '/').split('/')) {
        if (segment === '' || segment === '.') {
            continue;
        }
        if (segment === '..') {
            if (segments.length === 0) {
                return undefined;
            }
            segments.pop();
            continue;
        }
        segments.push(segment);
    }
    return segments.length === 0 ? undefined : segments.join('/');
}

export function parentOf(path: string): string {
    const slash = path.lastIndexOf('/');
    return slash === -1 ? '.' : path.slice(0, slash);
}

export function baseName(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
}

/** Joins a folder and a name, where the root folder is `.`. */
export function joinPath(folder: string, name: string): string {
    return folder === '.' ? name : `${folder}/${name}`;
}

/**
 * Builds every folder that holds a file, and every folder above them, from a flat list of file
 * paths. Folders come out sorted by path, the root first.
 */
export function buildTree(filePaths: Iterable<string>): FolderEntry[] {
    const files = new Map<string, Set<string>>();
    const folders = new Map<string, Set<string>>();
    const ensure = (folder: string): void => {
        if (folders.has(folder)) {
            return;
        }
        folders.set(folder, new Set());
        files.set(folder, new Set());
        if (folder === '.') {
            return;
        }
        const parent = parentOf(folder);
        ensure(parent);
        folders.get(parent)?.add(baseName(folder));
    };

    ensure('.');
    for (const path of filePaths) {
        const folder = parentOf(path);
        ensure(folder);
        files.get(folder)?.add(baseName(path));
    }

    const entries: FolderEntry[] = [];
    for (const [path, children] of folders) {
        entries.push({
            path,
            name: path === '.' ? '.' : baseName(path),
            depth: path === '.' ? 0 : path.split('/').length,
            files: [...(files.get(path) ?? [])].toSorted(compareText),
            folders: [...children].toSorted(compareText),
        });
    }
    return entries.toSorted((a, b) => (a.path === '.' ? -1 : b.path === '.' ? 1 : compareText(a.path, b.path)));
}
