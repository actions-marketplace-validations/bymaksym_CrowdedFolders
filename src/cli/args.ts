import { parseArgs } from 'node:util';

export const COMMANDS = ['check', 'init', 'explain', 'presets', 'rules', 'print-config'] as const;
export type Command = (typeof COMMANDS)[number];

export const FORMATS = ['text', 'json', 'sarif', 'github', 'markdown'] as const;
export type Format = (typeof FORMATS)[number];

export interface Args {
    readonly command: Command;
    readonly paths: readonly string[];
    readonly config: string | undefined;
    readonly root: string | undefined;
    readonly presets: readonly string[];
    readonly format: Format;
    readonly output: string | undefined;
    readonly stdin: boolean;
    readonly git: boolean;
    readonly maxWarnings: number | undefined;
    readonly quiet: boolean;
    readonly moves: boolean;
    readonly color: boolean | undefined;
    readonly suppressAll: boolean;
    readonly suppressRules: readonly string[];
    readonly pruneSuppressions: boolean;
    readonly passOnUnprunedSuppressions: boolean;
    readonly suppressionsLocation: string | undefined;
    readonly force: boolean;
    readonly help: boolean;
    readonly version: boolean;
}

export class UsageError extends Error {
    override readonly name = 'UsageError';
}

/** Reads the command line. Anything it does not know is an error, never ignored. */
export function parseCommandLine(argv: readonly string[]): Args {
    let parsed;
    try {
        parsed = parseArgs({
            args: [...argv],
            allowPositionals: true,
            strict: true,
            options: {
                config: { type: 'string', short: 'c' },
                root: { type: 'string' },
                preset: { type: 'string', short: 'p', multiple: true },
                format: { type: 'string', short: 'f' },
                output: { type: 'string', short: 'o' },
                stdin: { type: 'boolean' },
                'no-git': { type: 'boolean' },
                'max-warnings': { type: 'string' },
                quiet: { type: 'boolean', short: 'q' },
                moves: { type: 'boolean' },
                color: { type: 'boolean' },
                'no-color': { type: 'boolean' },
                'suppress-all': { type: 'boolean' },
                'suppress-rule': { type: 'string', multiple: true },
                'prune-suppressions': { type: 'boolean' },
                'pass-on-unpruned-suppressions': { type: 'boolean' },
                'suppressions-location': { type: 'string' },
                force: { type: 'boolean' },
                help: { type: 'boolean', short: 'h' },
                version: { type: 'boolean', short: 'v' },
            },
        });
    } catch (error) {
        throw new UsageError((error as Error).message);
    }
    const { values, positionals } = parsed;

    const [first, ...rest] = positionals;
    const isCommand = (COMMANDS as readonly string[]).includes(first ?? '');
    const command: Command = isCommand ? (first as Command) : 'check';
    const paths = isCommand ? rest : positionals;

    const format = values.format ?? 'text';
    if (!(FORMATS as readonly string[]).includes(format)) {
        throw new UsageError(`--format must be one of ${FORMATS.join(', ')}, not "${format}"`);
    }
    let maxWarnings: number | undefined;
    if (values['max-warnings'] !== undefined) {
        maxWarnings = Number(values['max-warnings']);
        if (!Number.isSafeInteger(maxWarnings) || maxWarnings < 0) {
            throw new UsageError(`--max-warnings must be a whole number of 0 or more, not "${values['max-warnings']}"`);
        }
    }
    if (values.color && values['no-color']) {
        throw new UsageError('--color and --no-color cannot both be given');
    }
    if (values['suppress-all'] && values['suppress-rule']) {
        throw new UsageError(
            '--suppress-all and --suppress-rule cannot both be given: one suppresses everything, the other only some rules',
        );
    }
    if (values.stdin && values['no-git']) {
        throw new UsageError(
            '--stdin and --no-git cannot both be given: with --stdin the files come from standard input',
        );
    }
    if (command === 'explain' && paths.length !== 1 && !values.help) {
        throw new UsageError('explain takes one folder: crowded-folders explain src/components');
    }
    if ((command === 'presets' || command === 'rules') && paths.length > 0) {
        throw new UsageError(`${command} takes no paths`);
    }

    return {
        command,
        paths,
        config: values.config,
        root: values.root,
        presets: values.preset ?? [],
        format: format as Format,
        output: values.output,
        stdin: values.stdin ?? false,
        git: !(values['no-git'] ?? false),
        maxWarnings,
        quiet: values.quiet ?? false,
        moves: values.moves ?? false,
        color: values['no-color'] ? false : values.color,
        suppressAll: values['suppress-all'] ?? false,
        suppressRules: values['suppress-rule'] ?? [],
        pruneSuppressions: values['prune-suppressions'] ?? false,
        passOnUnprunedSuppressions: values['pass-on-unpruned-suppressions'] ?? false,
        suppressionsLocation: values['suppressions-location'],
        force: values.force ?? false,
        help: values.help ?? false,
        version: values.version ?? false,
    };
}
