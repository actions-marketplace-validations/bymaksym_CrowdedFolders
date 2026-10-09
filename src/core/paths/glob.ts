/**
 * The glob patterns of the configuration, on paths relative to the root with `/` separators.
 *
 * | Pattern  | Matches                                        |
 * | -------- | ---------------------------------------------- |
 * | `*`      | anything inside one segment                    |
 * | `**`     | any number of segments, none included          |
 * | `?`      | one character that is not `/`                  |
 * | `{a,b}`  | either alternative                             |
 * | `[abc]`  | one of the characters (`[!abc]` negates)       |
 *
 * A pattern without `/` matches at any depth (`node_modules` is `**\/node_modules`), the way
 * `.gitignore` reads it; with a `/` it is anchored at the root, and a leading `/` anchors a single
 * name (`/data` is the root's `data`, not `lib/data`).
 */
export interface Glob {
    readonly source: string;
    test(path: string): boolean;
}

export function compileGlob(pattern: string): Glob {
    const isRooted = pattern.startsWith('/') || pattern.startsWith('./');
    const trimmed = trimSlashes(pattern.startsWith('./') ? pattern.slice(2) : pattern);
    const anchored = isRooted || trimmed.includes('/') ? trimmed : `**/${trimmed}`;
    const expression = new RegExp(`^${translate(anchored)}$`, 'u');
    return { source: pattern, test: path => expression.test(path) };
}

/**
 * Whether a path, or any folder above it, matches one of the globs: excluding `fixtures` excludes
 * `fixtures/vite/dist/main.js`.
 */
export function matchesSelfOrAncestor(path: string, globs: readonly Glob[]): boolean {
    if (globs.length === 0) {
        return false;
    }
    let current = path;
    for (;;) {
        if (globs.some(glob => glob.test(current))) {
            return true;
        }
        const slash = current.lastIndexOf('/');
        if (slash === -1) {
            return false;
        }
        current = current.slice(0, slash);
    }
}

/** Whether a pattern is one `compileGlob` can read; the message says why not. */
export function globProblem(pattern: string): string | undefined {
    if (pattern.trim() === '') {
        return 'is empty';
    }
    // How many of each are open: +1 for an opening character, -1 for a closing one.
    const depth = { '{': 0, '[': 0 };
    const pairs: Readonly<Record<string, ['[' | '{', number]>> = {
        '{': ['{', 1],
        '}': ['{', -1],
        '[': ['[', 1],
        ']': ['[', -1],
    };
    for (const char of pattern) {
        const pair = pairs[char];
        if (pair) {
            depth[pair[0]] += pair[1];
        }
        if (depth['{'] < 0 || depth['['] < 0) {
            return `closes a "${char}" it never opened`;
        }
    }
    if (depth['{'] !== 0) return 'leaves a "{" open';
    if (depth['['] !== 0) return 'leaves a "[" open';
    return pattern.includes('\\') ? 'uses "\\"; paths are written with "/"' : undefined;
}

/** Turns a glob into the source of a regular expression, one token at a time. */
function translate(pattern: string): string {
    let out = '';
    let index = 0;
    const braces = { open: 0 };
    while (index < pattern.length) {
        const [source, length] = token(pattern, index, braces);
        out += source;
        index += length;
    }
    return out;
}

/** The regular expression for the token at `index`, and how many characters of the glob it used. */
function token(pattern: string, index: number, braces: { open: number }): [string, number] {
    const char = pattern[index] ?? '';
    if (char === '*') {
        const isDouble = pattern[index + 1] === '*';
        const startsSegment = index === 0 || pattern[index - 1] === '/';
        if (isDouble && startsSegment && pattern[index + 2] === '/') {
            // `**/` is zero or more whole segments.
            return ['(?:[^/]+/)*', 3];
        }
        if (isDouble && startsSegment && index + 2 === pattern.length) {
            // A final `**` is the rest of the path.
            return ['.*', 2];
        }
        return ['[^/]*', 1];
    }
    if (char === '?') {
        return ['[^/]', 1];
    }
    if (char === '{') {
        braces.open++;
        return ['(?:', 1];
    }
    if (char === '}' && braces.open > 0) {
        braces.open--;
        return [')', 1];
    }
    if (char === ',' && braces.open > 0) {
        return ['|', 1];
    }
    if (char === '[') {
        const close = pattern.indexOf(']', index + 1);
        if (close === -1) {
            return [String.raw`\[`, 1];
        }
        const body = pattern.slice(index + 1, close);
        const isNegated = body.startsWith('!') || body.startsWith('^');
        const chars = escapeClass(isNegated ? body.slice(1) : body);
        return [isNegated ? `[^/${chars}]` : `[${chars}]`, close - index + 1];
    }
    return [escapeChar(char), 1];
}

function escapeChar(char: string): string {
    return /[$()+.^|\\\][{}]/u.test(char) ? `\\${char}` : char;
}

function escapeClass(body: string): string {
    let out = '';
    for (const char of body) {
        out += ['\\', ']', '[', '^'].includes(char) ? `\\${char}` : char;
    }
    return out;
}

function trimSlashes(pattern: string): string {
    let start = 0;
    let end = pattern.length;
    while (start < end && pattern[start] === '/') start++;
    while (end > start && pattern[end - 1] === '/') end--;
    return pattern.slice(start, end);
}
