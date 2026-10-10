# In CI and in hooks

crowded-folders reads file names only and has no dependencies, so it runs anywhere Node 20.19+ runs,
in half a second on a repository of 14,000 files (the Godot engine, measured).

**Pin an exact version.** Only a major version finds more than the one before (a new preset, a lower
limit: [decisions.md](decisions.md#what-a-version-promises)), but a pinned run is one you can repeat. The
examples below name the latest release and are updated with each one. Two ways to keep up without
surprises: install it as a devDependency, so the lockfile pins it and your dependency bot proposes
updates; or use the Action pinned by tag or SHA, which runs the version it was released with.

## Exit codes

| Code | Means                                                                                 |
| ---- | ------------------------------------------------------------------------------------- |
| `0`  | No errors, no stale suppressions, and no more warnings than `--max-warnings`.         |
| `1`  | Problems.                                                                             |
| `2`  | The configuration or the command line is wrong, or the tool broke. Never a clean run. |

## Output formats

| `--format` | For                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------- |
| `text`     | People (default). Colours in a terminal; `NO_COLOR`, `FORCE_COLOR`, `--color`, `--no-color`. |
| `github`   | GitHub Actions annotations, on the first file of each folder.                                |
| `sarif`    | GitHub code scanning and other SARIF viewers.                                                |
| `markdown` | A pull-request comment or `$GITHUB_STEP_SUMMARY`.                                            |
| `json`     | Scripts. Fields are only ever added in a minor version.                                      |

`--output <file>` writes the report to a file instead of standard output.

## GitHub Actions

The plainest form, with annotations on the pull request:

<!-- x-release-please-start-version -->

```yaml
name: Structure
on: [push, pull_request]
jobs:
    crowded-folders:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v7
            - uses: actions/setup-node@v7
              with: { node-version: 24 }
            - run: npx --yes crowded-folders@1.0.1 --format github
```

<!-- x-release-please-end -->

With a summary on the job page and SARIF for code scanning:

<!-- x-release-please-start-version -->

```yaml
- run: npx --yes crowded-folders@1.0.1 --format markdown >> "$GITHUB_STEP_SUMMARY"
  continue-on-error: true
- run: npx --yes crowded-folders@1.0.1 --format sarif --output crowded-folders.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v4
  with: { sarif_file: crowded-folders.sarif }
- run: npx --yes crowded-folders@1.0.1 --format github # the step that passes or fails
```

<!-- x-release-please-end -->

Or the action in this repository, which does the same and runs the crowded-folders version it was
released with, so pinning the action pins the tool (`version` runs another):

<!-- x-release-please-start-version -->

```yaml
- uses: bymaksym/CrowdedFolders@v1.0.1
  with:
      args: --max-warnings 0 # anything the command takes
      summary: true # add the Markdown report to the job summary
```

<!-- x-release-please-end -->

## GitLab CI

<!-- x-release-please-start-version -->

```yaml
crowded-folders:
    image: node:24
    script:
        - npx --yes crowded-folders@1.0.1
```

<!-- x-release-please-end -->

For a merge-request widget, GitLab reads Code Quality reports, not SARIF; use `--format json` and
convert, or keep the job log.

## Other CI (Azure Pipelines, Jenkins, CircleCI, Buildkite…)

Any step that can run Node: `npx --yes crowded-folders@1.0.1`. The exit code does the rest. <!-- x-release-please-version -->

## Git hooks

The check looks at the whole tree, so it is not tied to the files of a commit: run it on push, or on
commit if the repository is small.

**husky** (`.husky/pre-push`):

```sh
npx crowded-folders
```

**lefthook** (`lefthook.yml`):

```yaml
pre-push:
    commands:
        crowded-folders:
            run: npx crowded-folders
```

**pre-commit** (Python projects and others), with the hook this repository publishes. It runs the
published package at the version of the tag (it needs Node, which pre-commit installs):

<!-- x-release-please-start-version -->

```yaml
repos:
    - repo: https://github.com/bymaksym/CrowdedFolders
      rev: v1.0.1
      hooks:
          - id: crowded-folders # on pre-push; add `stages: [pre-commit]` to run it on every commit
```

<!-- x-release-please-end -->

The hook sets `pass_filenames: false` and `always_run: true` because the check is about folders, not the files of
one commit. To check only the folders a change touches, pass them:
`crowded-folders $(git diff --name-only origin/main...HEAD)` (their folders are checked, counting every
file in them).

## Monorepos

One run at the root with overrides per package ([configuring.md](configuring.md#monorepos)), or one
run per package, each with its own configuration: `cd packages/web && npx crowded-folders` (the
configuration is looked for from where the command runs, and its folder is the root).
