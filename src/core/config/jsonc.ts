/**
 * Parses JSON with comments (`//`, `/* *\/`) and trailing commas, the way `tsconfig.json` and VS
 * Code settings are written. A configuration is where the reason for a setting goes, so comments
 * are allowed in every `.json` this package reads.
 *
 * It blanks comments and trailing commas out — keeping every newline, so `JSON.parse` reports the
 * same line numbers the file has — and hands the rest to `JSON.parse`.
 */
export function parseJsonc(text: string): unknown {
    return JSON.parse(stripJsonc(text));
}

export function stripJsonc(text: string): string {
    const source = text.startsWith('\u{FEFF}') ? text.slice(1) : text;
    let out = '';
    let index = 0;
    // Where the last comma outside a string was written to `out`, until something other than
    // whitespace or a comment follows it.
    let pendingComma = -1;

    while (index < source.length) {
        const char = source[index] ?? '';
        if (char === '"') {
            const end = endOfString(source, index);
            out += source.slice(index, end);
            index = end;
            pendingComma = -1;
            continue;
        }
        const next = source[index + 1] ?? '';
        if (char === '/' && next === '/') {
            const end = source.indexOf('\n', index);
            const stop = end === -1 ? source.length : end;
            out += ' '.repeat(stop - index);
            index = stop;
            continue;
        }
        if (char === '/' && next === '*') {
            const end = source.indexOf('*/', index + 2);
            const stop = end === -1 ? source.length : end + 2;
            out += blank(source.slice(index, stop));
            index = stop;
            continue;
        }
        if (char === ',') {
            pendingComma = out.length;
            out += char;
            index++;
            continue;
        }
        if ((char === '}' || char === ']') && pendingComma !== -1) {
            out = `${out.slice(0, pendingComma)} ${out.slice(pendingComma + 1)}`;
        }
        if (char.trim() !== '') {
            pendingComma = -1;
        }
        out += char;
        index++;
    }
    return out;
}

/** The index just after the closing quote of the string that opens at `start`. */
function endOfString(source: string, start: number): number {
    let index = start + 1;
    while (index < source.length) {
        const char = source[index];
        if (char === '\\') {
            index += 2;
            continue;
        }
        if (char === '"') {
            return index + 1;
        }
        index++;
    }
    return source.length;
}

/** Spaces in place of every character except newlines. */
function blank(text: string): string {
    let out = '';
    for (const char of text) {
        out += char === '\n' || char === '\r' ? char : ' ';
    }
    return out;
}
