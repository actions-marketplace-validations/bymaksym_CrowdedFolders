import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { normalisePath } from '../core/paths/tree.ts';

export interface FileList {
    readonly files: readonly string[];
    /** Where the list came from, for `--debug` and error messages. */
    readonly source: 'filesystem' | 'git' | 'stdin';
}

/** Folders never walked when there is no git to ask: they are always someone else's or generated. */
const ALWAYS_SKIPPED = new Set(['.git', '.hg', '.svn', 'node_modules']);

/**
 * The files of the repository, relative to `root`: what git tracks plus what it would add (the
 * untracked files `.gitignore` does not hide), minus what was deleted. Without git, or outside a
 * repository, every file under `root` except version-control and `node_modules` folders.
 *
 * Asking git is the point: `.gitignore` and `.gitattributes` already say what is generated, and
 * reimplementing them would be a second, slightly different answer.
 */
export function listFiles(root: string, options: { readonly git: boolean }): FileList {
    if (options.git) {
        const files = gitFiles(root);
        if (files) {
            return { files, source: 'git' };
        }
    }
    return { files: walk(root), source: 'filesystem' };
}

/** Reads paths, one per line (or NUL-separated), from text such as `git ls-tree -r --name-only HEAD`. */
export function parseFileList(text: string): string[] {
    const separator = text.includes('\0') ? '\0' : /\r?\n/u;
    const files = new Set<string>();
    for (const line of text.split(separator)) {
        const path = normalisePath(line.trim());
        if (path !== undefined) {
            files.add(path);
        }
    }
    return [...files];
}

function gitFiles(root: string): string[] | undefined {
    const run = (args: readonly string[]): string | undefined => {
        try {
            return execFileSync('git', ['-C', root, ...args], {
                encoding: 'utf8',
                maxBuffer: 512 * 1024 * 1024,
                stdio: ['ignore', 'pipe', 'ignore'],
            });
        } catch {
            return undefined;
        }
    };
    // `-s` gives the mode, which tells a submodule (160000) from a file: a submodule is a folder
    // that belongs to another repository, not a file of this one.
    const tracked = run(['ls-files', '-z', '--cached', '--stage']);
    if (tracked === undefined) {
        return undefined;
    }
    const others = run(['ls-files', '-z', '--others', '--exclude-standard']) ?? '';
    const deleted = new Set((run(['ls-files', '-z', '--deleted']) ?? '').split('\0'));

    const files = new Set<string>();
    for (const record of tracked.split('\0')) {
        const tab = record.indexOf('\t');
        if (tab === -1 || record.startsWith('160000 ')) {
            continue;
        }
        const path = record.slice(tab + 1);
        if (!deleted.has(path)) {
            files.add(path);
        }
    }
    for (const path of others.split('\0')) {
        if (path !== '') {
            files.add(path);
        }
    }
    const marked = markedByAttributes(root, [...files]);
    return [...files].filter(path => !marked.has(path)).flatMap(path => normalisePath(path) ?? []);
}

/**
 * The files `.gitattributes` marks as generated or vendored (`linguist-generated`,
 * `linguist-vendored`): a repository that tells GitHub to fold them in diffs has already said nobody
 * arranges them by hand. bufbuild/buf marks `/private/gen/**`, vitess its protobuf code. Git answers,
 * so the rules are git's, nested `.gitattributes` included.
 */
function markedByAttributes(root: string, files: readonly string[]): Set<string> {
    const marked = new Set<string>();
    if (files.every(path => path !== '.gitattributes' && !path.endsWith('/.gitattributes'))) {
        return marked;
    }
    let output: string;
    try {
        output = execFileSync(
            'git',
            ['-C', root, 'check-attr', '-z', '--stdin', 'linguist-generated', 'linguist-vendored'],
            {
                encoding: 'utf8',
                input: `${files.join('\0')}\0`,
                maxBuffer: 512 * 1024 * 1024,
                stdio: ['pipe', 'pipe', 'ignore'],
            },
        );
    } catch {
        return marked;
    }
    // Records of three fields: the path, the attribute, and its value ("set", "unset", "unspecified" or
    // the value written, such as "true").
    const fields = output.split('\0');
    for (let index = 0; index + 2 < fields.length; index += 3) {
        const value = fields[index + 2];
        if (value === 'set' || value === 'true') {
            marked.add(fields[index] ?? '');
        }
    }
    return marked;
}

function walk(root: string): string[] {
    const files: string[] = [];
    const visit = (relative: string): void => {
        let entries;
        try {
            entries = readdirSync(join(root, relative), { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const path = relative === '' ? entry.name : `${relative}/${entry.name}`;
            if (entry.isDirectory()) {
                if (!ALWAYS_SKIPPED.has(entry.name)) {
                    visit(path);
                }
            } else if (entry.isFile()) {
                files.push(path);
            }
        }
    };
    visit('');
    return files;
}
