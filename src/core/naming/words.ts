/**
 * Splits a file stem into lowercase words, whatever the convention it was written in:
 * `user-service`, `user_service`, `userService`, `UserService` and `USER_SERVICE` all give
 * `['user', 'service']`, and `HTTPServer` gives `['http', 'server']`.
 *
 * Digits stay attached to the letters around them (`i18n`, `e1000`, `vector3`): splitting there
 * would turn `i18n-utils` into a group called `i`. A run of digits on its own (`2024-01-01-post`)
 * is a word of its own, which is how numbered and dated files are recognised later.
 *
 * One pass over the characters, no regular expression: it runs on every file of the repository.
 */
export function splitWords(stem: string): string[] {
    const words: string[] = [];
    // Code points, not UTF-16 units: a letter outside the BMP is one character. Grapheme clusters
    // (an emoji with a modifier) do not matter here: they are never part of a word.
    // eslint-disable-next-line @typescript-eslint/no-misused-spread -- code points are what is wanted
    const chars = [...stem];
    let current = '';

    const flush = (): void => {
        if (current === '') {
            return;
        }

        words.push(current.toLowerCase());
        current = '';
    };

    for (let index = 0; index < chars.length; index++) {
        const char = chars[index] ?? '';
        if (!isWordChar(char)) {
            flush();
            continue;
        }
        const previous = chars[index - 1] ?? '';
        const next = chars[index + 1] ?? '';
        if (current !== '' && isUpper(char)) {
            // fooBar → foo | Bar
            const isAfterLower = isLower(previous) || isDigit(previous);
            // HTTPServer → HTTP | Server: the last capital of a run starts the next word.
            const isEndsAcronym = isUpper(previous) && isLower(next);
            if (isAfterLower || isEndsAcronym) {
                flush();
            }
        }
        current += char;
    }
    flush();
    return words;
}

/** A word made only of digits: a date, an ordinal, a migration number. */
export function isNumericWord(word: string): boolean {
    if (word === '') {
        return false;
    }
    for (const char of word) {
        if (!isDigit(char)) {
            return false;
        }
    }
    return true;
}

const UPPER = /^\p{Lu}$/u;
const LOWER = /^\p{Ll}$/u;
// Letters of any script, cased or not (`用户`, `пользователь`), and digits of any script.
const WORD = /^[\p{L}\p{N}]$/u;

function isUpper(char: string): boolean {
    return UPPER.test(char);
}

function isLower(char: string): boolean {
    return LOWER.test(char);
}

function isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
}

function isWordChar(char: string): boolean {
    return WORD.test(char);
}
