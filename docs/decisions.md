# Decisions

Why crowded-folders is built the way it is: what was decided, why, and what was discarded. The
discarded half is the one that saves a discussion a year from now.

## A command, not an ESLint rule

**Decided:** a standalone command, with plugins of its own.
**Why:** an ESLint rule looks at one file and caches per file; this compares siblings, so a rule would
have to read the folder from inside, and an unchanged file would not be re-checked when a sibling
appears. And it has to work for Go, Python, Unity and LaTeX repositories, which do not run ESLint.
**Discarded:** an ESLint plugin as the only form. A thin wrapper can come later, on top of the API.

## The file list comes from git

**Decided:** `git ls-files` (tracked plus untracked-not-ignored), the disk without git, or `--stdin`.
What `.gitattributes` marks `linguist-generated` or `linguist-vendored` is left out, as git reads it.
**Why:** `.gitignore` and `.gitattributes` already say what is generated; a second implementation would
be a second answer.
`--stdin` lets the field trial check thirty repositories without downloading their contents.
**Discarded:** reimplementing `.gitignore`.

## The root is never the current folder

**Decided:** the root is the configuration's folder, else the top of the git repository.
**Why:** the same command typed from a sub-folder must check the same thing. A tool whose answer
depends on where it was typed gives two answers.

## Modules, not files

**Decided:** limits count modules (a file with its companions), cut at the first dot.
**Why:** an Angular component is four files and a Go file is one; counting files would make Angular
folders "crowded" at a quarter of the size. The first dot joins every companion extension
(`.spec.ts`, `.cs.meta`, `.png.import`) without a list per ecosystem.
**Discarded:** the last dot plus a list of known double extensions — a list that is never complete.

## The limits are measured, or quoted

**Decided:** 20 modules is the median 95th percentile over 30 repositories ([field-trial.md](field-trial.md)).
A preset only changes it when its ecosystem's guide gives a number, and quotes it.
**Why:** a limit that is an opinion dressed as a standard is ignored at the first disagreement. Eight
presets had 15 before the trial, with no source; they were removed.
**Discarded:** one number for everything; a number per preset without a source.

## Every exception carries its reason

**Decided:** `reason` is required on overrides, the configuration does not load without it, and an
override that matches nothing is reported.
**Why:** an exception without a reason cannot be reviewed, and nobody knows a year later whether it
still holds. A silence that silences nothing rots.

## Suppressions that only go down

**Decided:** ESLint's bulk-suppression model (`--suppress-all`, `--prune-suppressions`), plus: a
suppressed number may not grow, and a suppression that remembers more than is measured fails until
pruned.
**Why:** adopting the tool must not require reorganising a repository first — but a suppression that
can quietly climb back is not a ceiling.
**Discarded:** a baseline that only stops new folders (an old folder could double); warnings instead
of errors (warnings are read for a week).

## Presets carry their sources

**Decided:** a preset has `sources`, and the conventions that contradict the tool win: Vue's flat
`components/`, Android's `res/`, Go's packages.
**Why:** a tool that fights an ecosystem's own guide is uninstalled, rightly.

## Zero runtime dependencies

**Decided:** none: the glob matcher, the JSONC reader and the schema validator are a few hundred lines
here.
**Why:** `npx` installs nothing, there is nothing to audit, and it runs in a Python repository's CI as
easily as in a Node one.
**Discarded:** `picomatch`, `ajv`, `jsonc-parser` — each fine, each a dependency for one function.

## One schema, two uses

**Decided:** the JSON Schema published as `schema.json` is the one the configuration is checked against.
**Why:** a schema for editors and a validator for the command would drift; one would accept what the
other rejects.

## Node 20.19 and later

**Decided:** `^20.19.0 || ^22.13.0 || >=24`, ESLint 10's range; TypeScript's `lib` is ES2023 and
`eslint-plugin-n` reads `engines`, so a newer API fails before CI's Node 20.19 job does.
**Why:** a minimum that nothing runs is a promise kept by luck.

## No moves applied

**Decided:** `--moves` prints `git mv` commands and never moves anything.
**Why:** moving a file breaks every import of it; whether that is worth it is the author's call.

## What a version promises

**Decided:** a change that makes the default configuration find more is a breaking change, released
in a major version: a new preset that is detected, a lower limit, a rule turned on in `recommended`, a
word that now groups. Its commit is marked breaking (`feat!:`). A change that only finds less (a false
positive removed) is a fix or a feature. The first version is 1.0.0, so this holds from the start. The
documentation names an exact version, and the Action runs the version it was released with.
**Why:** presets are detected, so a repository with no configuration changes behaviour on update
without touching anything, and the ones that run the tool in CI find out when their build turns red.
This is how ESLint treats `eslint:recommended`.
**Discarded:** starting at 0.x, where breaking changes go out in minors that `@0` lets in; recommending
`@latest` in CI; relying on `init` alone, since a preset's contents
change between versions even when its name is written down.
