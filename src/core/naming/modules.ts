import { isNumericWord, splitWords } from './words.ts';

/** How file names are read: which files are one module, and which leading words are not a subject. */
export interface Naming {
    /**
     * Applied in order to each stem; what they match is removed. They are what makes `foo_test.go`,
     * `test_foo.py` and `FooTest.java` the same module as `foo.go`, `foo.py` and `Foo.java`.
     */
    readonly companions: readonly RegExp[];
    /** Lowercase words dropped from the front before reading the subject: `i` of `IUserService`, `bp` of `BP_Door`. */
    readonly ignoreLeadingWords: ReadonlySet<string>;
    /**
     * When false, a module whose subject starts with a number (`0001_initial`, `2024-01-01-post`) belongs to no group.
     */
    readonly groupNumericPrefixes: boolean;
}

/** A module: the files of one folder that share a stem — `foo.ts`, `foo.spec.ts`, `foo.html`. */
export interface Module {
    /** The stem every file of the module shares, after removing companions: `user-service`. */
    readonly stem: string;
    /** File names, sorted. */
    readonly files: readonly string[];
    /** Every word of the stem, lowercase: `['i', 'user', 'service']`. */
    readonly words: readonly string[];
    /** The words that say what the module is about, after the ignored leading words: `['user', 'service']`. */
    readonly subject: readonly string[];
}

/**
 * The stem of a file name: everything before the first dot, without companions and without the
 * underscores that mark partials and dunder files (`_tokens.scss`, `__init__.py`).
 *
 * The first dot, not the last, is what joins `foo.spec.ts`, `foo.component.html`, `Player.cs.meta`
 * and `foo.d.ts` with `foo.ts`. A name that is only a dot-file (`.gitignore`) keeps its name.
 */
export function stemOf(fileName: string, naming: Pick<Naming, 'companions'>): string {
    const withoutLeadingDots = trimStart(fileName, '.');
    const dot = withoutLeadingDots.indexOf('.');
    let stem = dot === -1 ? withoutLeadingDots : withoutLeadingDots.slice(0, dot);
    if (stem === '') {
        stem = withoutLeadingDots === '' ? fileName : withoutLeadingDots;
    }
    // Until nothing changes, so suffixes stack: `x_linux_amd64_test` → `x_linux_amd64` → `x_linux` → `x`.
    // Bounded, in case two patterns feed each other.
    for (let pass = 0; pass < 8; pass++) {
        const before = stem;
        for (const companion of naming.companions) {
            const stripped = stem.replace(companion, '');
            // A companion never erases a name: `test.py` stays `test`, not ''.
            if (stripped !== '') {
                stem = stripped;
            }
        }
        if (stem === before) {
            break;
        }
    }
    const trimmed = trimEnd(trimStart(stem, '_'), '_');
    return trimmed === '' ? stem : trimmed;
}

/** The words of a stem that say what it is about: leading ignored words dropped, at least one kept. */
export function subjectOf(words: readonly string[], naming: Pick<Naming, 'ignoreLeadingWords'>): readonly string[] {
    let start = 0;
    while (start < words.length - 1 && naming.ignoreLeadingWords.has(words[start] ?? '')) {
        start++;
    }
    return words.slice(start);
}

/**
 * The group a module belongs to, from the first `length` words of its subject, or `undefined` when
 * it belongs to none: a subject shorter than that, or one that starts with a number when numbers do
 * not group.
 */
export function groupKeyOf(
    module: Module,
    length: number,
    naming: Pick<Naming, 'groupNumericPrefixes'>,
): string | undefined {
    if (module.subject.length < length) {
        return undefined;
    }
    const first = module.subject[0] ?? '';
    return !naming.groupNumericPrefixes && isNumericWord(first) ? undefined : module.subject.slice(0, length).join('-');
}

/** Groups the files of one folder into modules, sorted by stem. */
export function modulesOf(fileNames: readonly string[], naming: Naming): Module[] {
    const byStem = new Map<string, string[]>();
    for (const name of fileNames) {
        const stem = stemOf(name, naming);
        // Case-insensitive: `Readme.md` and `README.txt` are one module on a case-insensitive disk.
        const id = stem.toLowerCase();
        const files = byStem.get(id);
        if (files) {
            files.push(name);
        } else {
            byStem.set(id, [name]);
        }
    }
    const modules: Module[] = [];
    for (const files of byStem.values()) {
        const sorted = files.toSorted(compareText);
        const stem = stemOf(sorted[0] ?? '', naming);
        const words = splitWords(stem);
        modules.push({ stem, files: sorted, words, subject: subjectOf(words, naming) });
    }
    return modules.toSorted((a, b) => compareText(a.stem, b.stem));
}

/** The words of a folder name, joined the way group keys are: `RenderTargets` → `render-targets`. */
export function folderKeyOf(folderName: string): string {
    return splitWords(folderName).join('-');
}

/**
 * Whether a group key only restates where the files already are: the name of their folder or of a
 * folder above it, allowing the plural. `render-*` in `render/`, `hook-*` in `hooks/`, `drag-*` in
 * `drag-drop/`, `Color*` in `ColorPicker/`, `toolbar-*` in `toolbar/testing/`: moving them into a
 * folder named after the key would say the same word twice.
 */
export function keyRestatesPath(key: string, folderPath: string): boolean {
    if (folderPath === '.') {
        return false;
    }
    const keyWords = key.split('-');
    return folderPath.split('/').some(segment => containsWords(splitWords(segment), keyWords));
}

function containsWords(words: readonly string[], sequence: readonly string[]): boolean {
    for (let start = 0; start + sequence.length <= words.length; start++) {
        if (sequence.every((word, offset) => sameWord(words[start + offset] ?? '', word))) {
            return true;
        }
    }
    return false;
}

function sameWord(a: string, b: string): boolean {
    return a === b || a === `${b}s` || a === `${b}es` || `${a}s` === b;
}

/** Locale-independent order, so that output is the same on every machine. */
export function compareText(a: string, b: string): number {
    if (a < b) {
        return -1;
    }
    return a > b ? 1 : 0;
}

function trimStart(text: string, char: string): string {
    let start = 0;
    while (text[start] === char) {
        start++;
    }
    return text.slice(start);
}

function trimEnd(text: string, char: string): string {
    let end = text.length;
    while (end > 0 && text[end - 1] === char) {
        end--;
    }
    return text.slice(0, end);
}
