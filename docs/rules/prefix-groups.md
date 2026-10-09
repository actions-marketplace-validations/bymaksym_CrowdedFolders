# `prefix-groups`

At least `min` modules whose names start with the same word belong in a folder named after it.

**On in `recommended`:** error, 4 modules. Options and defaults: [configuration.md](../configuration.md#prefix-groups).

```text
cli/
  render-json.ts  render-markdown.ts  render-pr.ts  render-sarif.ts  render-text.ts  main.ts  args.ts

  ✖ error  prefix-groups  5 modules start with "render" (render-json, render-markdown, render-pr,
           render-sarif, render-text): they are a folder that was never made — cli/render/.
```

The prefix is doing the job a directory should. Once they are in `cli/render/`, the folder says
"render" once and the names get shorter (see [`redundant-prefix`](redundant-prefix.md)).

## How the prefix is read

1. The **stem** of each file: its name up to the first dot, without companions (`render-json.spec.ts`
   is `render-json`).
2. Its **words**, in any convention: `render-json`, `render_json`, `renderJson` and `RenderJson` are all
   `render`, `json`. Acronyms end where the next word starts: `HTTPServer` is `http`, `server`.
3. Leading words that say nothing are skipped (`naming.ignoreLeadingWords`): `use` of React hooks,
   `i` of C# interfaces, `bp` of Unreal blueprints.
4. The first word (or the first `words` words) is the group.

Modules, not files, are counted: `render-json.ts` and `render-json.spec.ts` are one.

## When it stays quiet, and why

| Case                                                                     | Example                                                                                                        | Why                                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The prefix is the folder's name, or a folder's above it (plural allowed) | `render/render-json.ts`, `hooks/hook-x.ts`, `ColorPicker/ColorInput.tsx`, `toolbar/testing/toolbar-harness.ts` | They are already where they belong.                                                     |
| Every module of the folder shares it                                     | `tooling/check-a`, `check-b`, `check-c`, `check-d` and nothing else                                            | Moving everything down one level only adds a level; maybe rename the folder.            |
| The prefix is in `ignore`                                                | `test`, `tests`, `spec`, `get`, `set`, `is`, `has`, `can`, `should` in `recommended`                           | `GetAlbum`, `IsPlayed`, `test_parser` are not about "get", "is" or "test".              |
| The name starts with a number                                            | `0001_initial.py`, `2024-01-01-post.md`                                                                        | Numbers order things; they do not group them. `naming.groupNumericPrefixes` changes it. |
| The rest of each name is a language                                      | `README-ja`, `README-ko`, `README-ru`, `README-zh` (bat); `strings_ar` … `strings_zh` (localsend)              | One document in several languages is not a family of topics.                            |
| Every module is the prefix, a number and a title                         | `ADR-001-Use-EFCore-In-Application-Layer`, `ADR-002-…` (CleanArchitecture)                                     | A numbered series is kept flat and in order, like migrations.                           |
| Fewer than `min`                                                         | three `user-*` modules                                                                                         | Three is a coincidence; four is a family with a name.                                   |

Each case was a false positive found in the [field trial](../field-trial.md).

## Options

| Option   | Default                                                                         |                                                                                                             |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `min`    | `4`                                                                             | How many modules make a group. `strict` uses 3; `c-cpp` 5; game presets 15 (Allar's style guide, rule 2.7). |
| `words`  | `1`                                                                             | How many leading words form the prefix. With 2, `user-list-*` and `user-card-*` are two groups.             |
| `ignore` | `[]` (and `test, tests, spec, get, set, is, has, can, should` in `recommended`) | Prefixes that never group, lowercase, words joined with `-`.                                                |
| `hint`   | `""`                                                                            | Added to the message: what a folder costs in this ecosystem.                                                |

## Where a folder is not free

A group is reported as a **warning** with a hint where making a folder changes more than the tree:
`go` (a folder is a package), `terraform` (a module), `rails` in `app/models` (a namespace), `docs`
in `docs/`, `doc/` and `blog/` (moving a page changes its URL). Under Next.js's `app/` and SvelteKit's `src/routes` the hint says to
use a private folder (`_name`) or a route group (`(name)`), which group files without changing URLs.

## Moves

`--moves` prints a `git mv` for every file of a group. They are suggestions only: moving files breaks
imports, and that is the author's call.
