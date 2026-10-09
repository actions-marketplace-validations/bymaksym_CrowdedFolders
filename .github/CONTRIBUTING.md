# Contributing

Thanks for wanting to help. This page is short on purpose; [docs/decisions.md](../docs/decisions.md)
says why things are the way they are, and [docs/how-it-works.md](../docs/how-it-works.md) how they
work. Read the part you are about to change.

## Getting it running

```sh
pnpm install          # pnpm, the version in package.json "packageManager"
pnpm test             # node --test, straight from src/ (Node 24 runs TypeScript)
pnpm run build        # dist/, what is published
node bin/crowded-folders.js --help
```

## Before opening a pull request

`pnpm run check:all` runs every check and prints a summary (`just check` does the same). Commits
follow [Conventional Commits](https://www.conventionalcommits.org/) (a hook checks them): release-please
writes the changelog and picks the version from them. A change that makes the default configuration
find more (a new preset, a lower limit, a rule turned on) is breaking: mark it `feat!:`
([decisions.md](../docs/decisions.md#what-a-version-promises)).

## What makes a change easy to accept

- **A limit that changes needs its measurement.** Run `node tooling/field-trial.mjs --docs` before and
  after, and say what moved in [docs/field-trial.md](../docs/field-trial.md). A number that moves
  unexplained cannot be told from a regression.
- **A new preset needs sources**: the ecosystem's own guide, quoted where it gives a number, and a
  repository of that ecosystem added to the field trial. The issue template for presets asks for both.
- **A false positive needs the real name that caused it**, as a test.
- **No runtime dependency.** `npx` installs nothing, and that is part of the product.
- **`src/core` stays pure**: no `node:` imports, no `process` (ESLint enforces it). The disk, git and
  modules belong in `src/node`.
- **Every silence carries its reason**: an `eslint-disable` with `-- why`, an override with `reason`.
- **Generated files are not edited by hand**: `schema.json`, `docs/configuration.md`, `docs/presets.md`
  (from `src/generated.test.ts`, run `pnpm test`) and `docs/field-trial.md` (from the field trial).

## Out of scope

Moving files for the user (it breaks imports), reading file contents, and anything that needs the
network at run time.

## Security

Please report vulnerabilities privately: [SECURITY.md](SECURITY.md).
