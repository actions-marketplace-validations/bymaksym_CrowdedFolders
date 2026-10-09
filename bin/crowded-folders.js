#!/usr/bin/env node
// @ts-check
// The executable. It only starts the compiled command, so that a missing build says what to do
// instead of failing on an import.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const main = new URL('../dist/cli/main.js', import.meta.url);

if (existsSync(fileURLToPath(main))) {
    const { run } = await import(main.href);
    process.exitCode = await run(process.argv.slice(2));
} else {
    const installed = fileURLToPath(import.meta.url).includes('node_modules');
    process.stderr.write(
        installed
            ? 'crowded-folders: this installation is incomplete (dist/ is missing). Install it again.\n'
            : 'crowded-folders: the command is not built yet. Run `pnpm run build` first.\n',
    );
    process.exitCode = 2;
}
