import { ConfigError } from '../node/load-config.ts';
import { parseCommandLine, UsageError } from './args.ts';
import { check } from './commands/check.ts';
import { explain } from './commands/explain.ts';
import { init } from './commands/init.ts';
import { listPresets, listRules, printConfig } from './commands/lists.ts';
import { HELP } from './help.ts';
import { type Io, processIo } from './io.ts';
import { openSession } from './session.ts';
import { TOOL } from './tool.ts';

/** Runs the command and returns its exit code: 0 clean, 1 problems, 2 the input was wrong or it broke. */
export async function run(argv: readonly string[], io: Io = processIo()): Promise<number> {
    try {
        const args = parseCommandLine(argv);
        if (args.help) {
            io.write(HELP);
            return 0;
        }
        if (args.version) {
            io.write(`${TOOL.version}\n`);
            return 0;
        }
        if (args.command === 'presets') {
            return listPresets(io);
        }
        if (args.command === 'rules') {
            return listRules(io);
        }
        const session = await openSession(args, io);
        switch (args.command) {
            case 'init': {
                return await init(args, io, session);
            }
            case 'explain': {
                return explain(args, io, session);
            }
            case 'print-config': {
                return printConfig(args, io, session);
            }
            default: {
                return check(args, io, session);
            }
        }
    } catch (error) {
        if (error instanceof UsageError) {
            io.error(`crowded-folders: ${error.message}\nRun crowded-folders --help for the options.\n`);
            return 2;
        }
        if (error instanceof ConfigError) {
            io.error(`crowded-folders: ${error.message}\n`);
            return 2;
        }
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
        io.error(`crowded-folders broke — this is a bug, please report it at ${TOOL.url}/issues\n${message}\n`);
        return 2;
    }
}
