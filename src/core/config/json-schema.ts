/**
 * The part of JSON Schema (draft-07) this package writes, and a validator for exactly that part.
 *
 * One schema does both jobs: it is published as `schema.json` for editors to autocomplete, and it is
 * what the configuration is checked against when it loads. Two descriptions of the same file would
 * drift apart; this way the editor and the command cannot disagree.
 */
export interface JsonSchema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    markdownDescription?: string;
    type?: JsonType | readonly JsonType[];
    enum?: readonly unknown[];
    const?: unknown;
    properties?: Readonly<Record<string, JsonSchema>>;
    required?: readonly string[];
    additionalProperties?: boolean | JsonSchema;
    propertyNames?: JsonSchema;
    items?: JsonSchema | readonly JsonSchema[];
    additionalItems?: boolean;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    pattern?: string;
    anyOf?: readonly JsonSchema[];
    default?: unknown;
    examples?: readonly unknown[];
    definitions?: Readonly<Record<string, JsonSchema>>;
}

export type JsonType = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

export interface SchemaProblem {
    /** Where, as a path into the value: `rules["max-files"][1].max`. */
    readonly at: string;
    readonly message: string;
}

/** Checks a value against a schema; an empty list means it fits. */
export function validate(value: unknown, schema: JsonSchema, at = ''): SchemaProblem[] {
    const problems: SchemaProblem[] = [];
    check(value, schema, at, problems);
    return problems;
}

function check(value: unknown, schema: JsonSchema, at: string, problems: SchemaProblem[]): void {
    if (schema.anyOf) {
        const attempts = schema.anyOf.map(option => validate(value, option, at));
        if (attempts.some(attempt => attempt.length === 0)) {
            return;
        }
        // Report the attempt that got furthest: the one whose problems are deepest in the value.
        const closest = attempts.toSorted((a, b) => depthOf(b) - depthOf(a))[0] ?? [];
        problems.push(...closest);
        return;
    }
    if (schema.type !== undefined && !fitsType(value, schema.type)) {
        problems.push({ at: label(at), message: `must be ${describeType(schema.type)}, not ${typeOf(value)}` });
        return;
    }
    if (schema.const !== undefined && value !== schema.const) {
        problems.push({ at: label(at), message: `must be ${JSON.stringify(schema.const)}` });
        return;
    }
    if (schema.enum && !schema.enum.includes(value)) {
        const options = schema.enum.map(option => JSON.stringify(option)).join(', ');
        problems.push({ at: label(at), message: `must be one of ${options}, not ${JSON.stringify(value)}` });
        return;
    }
    if (typeof value === 'number') {
        if (schema.minimum !== undefined && value < schema.minimum) {
            problems.push({ at: label(at), message: `must be at least ${schema.minimum}` });
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
            problems.push({ at: label(at), message: `must be at most ${schema.maximum}` });
        }
    }
    if (typeof value === 'string') {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            problems.push({
                at: label(at),
                message:
                    schema.minLength === 1 ? 'must not be empty' : `must have at least ${schema.minLength} characters`,
            });
        }
        if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) {
            problems.push({ at: label(at), message: `must match ${schema.pattern}` });
        }
    }
    if (Array.isArray(value)) {
        checkArray(value, schema, at, problems);
    } else if (isObject(value)) {
        checkObject(value, schema, at, problems);
    }
}

function checkArray(value: readonly unknown[], schema: JsonSchema, at: string, problems: SchemaProblem[]): void {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
        problems.push({
            at: label(at),
            message: `must have at least ${schema.minItems} item${schema.minItems === 1 ? '' : 's'}`,
        });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        problems.push({
            at: label(at),
            message: `must have at most ${schema.maxItems} item${schema.maxItems === 1 ? '' : 's'}`,
        });
    }
    if (Array.isArray(schema.items)) {
        const tuple: readonly JsonSchema[] = schema.items;
        for (const [index, itemSchema] of tuple.entries()) {
            if (index < value.length) {
                check(value[index], itemSchema, `${at}[${index}]`, problems);
            }
        }
        if (schema.additionalItems === false && value.length > tuple.length) {
            problems.push({ at: label(at), message: `must have at most ${tuple.length} items` });
        }
    } else if (schema.items) {
        const itemSchema = schema.items as JsonSchema;
        for (const [index, item] of value.entries()) check(item, itemSchema, `${at}[${index}]`, problems);
    }
    if (!schema.uniqueItems) {
        return;
    }
    const seen = new Set<string>();
    for (const item of value) {
        const id = JSON.stringify(item);
        if (seen.has(id)) {
            problems.push({ at: label(at), message: `repeats ${id}` });
        }
        seen.add(id);
    }
}

function checkObject(
    value: Readonly<Record<string, unknown>>,
    schema: JsonSchema,
    at: string,
    problems: SchemaProblem[],
): void {
    for (const key of schema.required ?? []) {
        if (value[key] === undefined) {
            problems.push({ at: label(at), message: `needs "${key}"` });
        }
    }
    for (const [key, item] of Object.entries(value)) {
        const where =
            at === '' ? key : `${at}${/^[$A-Z_a-z][\w$]*$/u.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`}`;
        if (schema.propertyNames) {
            for (const problem of validate(key, schema.propertyNames, where)) {
                problems.push({ at: problem.at, message: `is not a known name: ${problem.message}` });
            }
        }
        const known = schema.properties?.[key];
        if (known) {
            check(item, known, where, problems);
        } else if (schema.additionalProperties === false) {
            const names = Object.keys(schema.properties ?? {});
            const close = names.find(name => isCloseTo(name, key));
            problems.push({
                at: label(where),
                message: close
                    ? `is not a known setting; did you mean "${close}"?`
                    : `is not a known setting${names.length > 0 ? ` (known: ${names.join(', ')})` : ''}`,
            });
        } else if (typeof schema.additionalProperties === 'object') {
            check(item, schema.additionalProperties, where, problems);
        }
    }
}

function fitsType(value: unknown, type: JsonType | readonly JsonType[]): boolean {
    const types: readonly JsonType[] = typeof type === 'string' ? [type] : type;
    return types.some(one => {
        switch (one) {
            case 'array': {
                return Array.isArray(value);
            }
            case 'object': {
                return isObject(value);
            }
            case 'integer': {
                return Number.isSafeInteger(value);
            }
            case 'null': {
                return value === null;
            }
            case 'number': {
                return typeof value === 'number' && Number.isFinite(value);
            }
            default: {
                return typeof value === one;
            }
        }
    });
}

export function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typeOf(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'an array';
    return typeof value === 'object' ? 'an object' : `${typeof value} ${JSON.stringify(value)}`;
}

function describeType(type: JsonType | readonly JsonType[]): string {
    const names: Record<JsonType, string> = {
        array: 'a list',
        boolean: 'true or false',
        integer: 'a whole number',
        null: 'null',
        number: 'a number',
        object: 'an object',
        string: 'a string',
    };
    const types: readonly JsonType[] = typeof type === 'string' ? [type] : type;
    return types.map(one => names[one]).join(' or ');
}

function label(at: string): string {
    return at === '' ? '(the configuration)' : at;
}

function depthOf(problems: readonly SchemaProblem[]): number {
    return Math.max(0, ...problems.map(problem => problem.at.length));
}

/** One edit apart, or the same ignoring case: catches `exlude` and `Rules`. */
function isCloseTo(a: string, b: string): boolean {
    if (a.toLowerCase() === b.toLowerCase()) {
        return true;
    }
    if (Math.abs(a.length - b.length) > 1) {
        return false;
    }
    let edits = 0;
    let index = 0;
    let index_ = 0;
    while (index < a.length && index_ < b.length) {
        if (a[index] === b[index_]) {
            index++;
            index_++;
            continue;
        }
        edits++;
        if (edits > 1) {
            return false;
        }
        if (a.length > b.length) index++;
        else if (b.length > a.length) index_++;
        else {
            index++;
            index_++;
        }
    }
    return edits + (a.length - index) + (b.length - index_) <= 1;
}
