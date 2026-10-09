# crowded-folders — notes for agents

crowded-folders finds the folders of a repository that have become a drawer. One analysis, a command
(`npx crowded-folders`) and an API (`import { lint } from 'crowded-folders'`).
[CONTRIBUTING.md](.github/CONTRIBUTING.md) says how to run it; this file is the rules, each with its
reason, because a rule without one gets broken the first time it is in the way.

## Where things live

- `src/core/` — the analysis: names → modules → groups, globs, the tree, the rules, the engine,
  suppressions, presets, the output formats. **Pure**: no `node:`, no `process` (ESLint enforces it),
  so it runs in a browser or a worker and can be tested without a disk.
- `src/node/` — the disk, git, finding and loading configurations, resolving plugins.
- `src/cli/` — the command: arguments, the commands, the help.
- `tooling/` — this repository's own scripts (`check`, `field-trial`, `test-package`), plain Node with
  JSDoc types (`tsconfig.tooling.json`).
- `docs/` — for users. [how-it-works.md](docs/how-it-works.md) and [decisions.md](docs/decisions.md):
  read the part you are about to change.

## Rules

- **What is published must run on Node 20.19** (`engines`). TypeScript's `lib` is ES2023 and
  `eslint-plugin-n` reads `engines`, so `Object.groupBy` or `Set#union` fail before CI's floor job.
- **No runtime dependency.** `npx` installs nothing; a glob matcher or a schema validator is written
  here.
- **A limit that changes needs its measurement**: `node tooling/field-trial.mjs --docs` before and after,
  and the reason in the commit. A number that moves unexplained cannot be told from a regression.
- **A preset has sources.** Where its guide gives a number, it uses it and quotes it; where none does, it
  inherits `recommended`'s measured 20. A number without a source is an opinion and is said to be one.
- **A false positive becomes a test with the real name that caused it.**
- **Every silence carries its reason**: `eslint-disable` with `-- why`; an override with `reason` (the
  configuration does not load without one).
- **Regular expressions run on every file name of large repositories**: keep them linear
  (`eslint-plugin-regexp` flags backtracking). The word splitter is a loop, not a regex, for that reason.
- **Generated files are not edited by hand**: `schema.json`, `docs/configuration.md`, `docs/presets.md`
  (written by `src/generated.test.ts`; on CI they are compared, never written) and
  `docs/field-trial.md` (by `tooling/field-trial.mjs --docs`), `CHANGELOG.md` (release-please).
- **Never apply moves.** `--moves` prints `git mv`; moving breaks imports, and that is the user's call.
- **`eslint --fix` with unicorn rewrites more than it says**: snapshot the tree first and read the diff.

## Before saying something is done

| Command                             | Does                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `just check` / `pnpm run check:all` | everything: types, lint, format, spelling, secrets, tests with coverage, build, the tool on itself, the package, the tarball |
| `just verify`                       | types and tests                                                                                                              |
| `just fix`                          | lint and format fixes, then verify                                                                                           |
| `just e2e`                          | the built tarball installed and run, and the field trial on real repositories                                                |
