# Configuring crowded-folders

Every setting, with its type and default, is in [configuration.md](configuration.md), which is generated
from the code. This page is how to use them.

## Where the configuration lives

The first of these found, from the current folder upwards to the top of the git repository:

| File                                             | Notes                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `crowded-folders.config.json`                    | What `init` writes. Comments and trailing commas are allowed.                   |
| `crowded-folders.config.jsonc`                   | The same, for editors that only accept comments in `.jsonc`.                    |
| `crowded-folders.config.mjs`, `.js`              | A module whose default export is the configuration, or a function returning it. |
| `.config/crowded-folders.json`, `.jsonc`, `.mjs` | For repositories that keep tool settings in `.config/`.                         |
| `package.json` → `"crowded-folders"`             | A key, for a small project.                                                     |

Two of them in the same folder is an error: one would be read and the other ignored in silence.
`--config <file>` names one explicitly.

**The root** — the folder whose files are checked — is the folder of the configuration (the folder
above `.config/`), not the folder the command was typed in. Without a configuration it is the top of
the git repository. `--root` sets it.

## Starting from presets

```jsonc
{
    "$schema": "https://unpkg.com/crowded-folders/schema.json",
    "extends": ["recommended", "react"],
}
```

`extends` takes built-in presets, plugin presets (`namespace/preset`), packages
(`@acme/crowded-folders-config`) and files (`./base.json`). They apply in order, later ones win, and each
is applied once, however many times it is reached: `["react", "strict"]` applies `recommended` (which
both extend) a single time.

Without any configuration the command detects the presets and says which it used; `init` writes them
down so the choice is visible and reviewed. Files inside tests, examples, playgrounds and templates
are not evidence (a `go.mod` among test fixtures does not make a Go repository). A preset found in a
sub-folder, such as a Flutter app in `app/`, gets its root-anchored excludes from there: `init` writes
`app/android`, `app/ios` and the rest into `exclude`, where they can be read and changed.

## Rules

```jsonc
{
    "rules": {
        "max-files": ["error", { "max": 25 }],
        "prefix-groups": "warn",
        "redundant-prefix": "error",
    },
}
```

A bare severity (`"error"`, `"warn"`, `"off"`) keeps the options set by the presets; `[severity, options]`
merges new options over them. Warnings are printed but never fail the run unless `--max-warnings` says
so.

## Lists accumulate; `!` removes

`exclude`, `include`, `naming.companions`, `naming.ignoreLeadingWords` and the lists inside rule options
(`prefix-groups.ignore`) add to what the presets set. To take something out, write it with `!`:

```jsonc
{
    "extends": ["recommended"],
    // recommended leaves dist/ out; this repository commits a hand-written one.
    "exclude": ["!dist"],
    "rules": {
        // recommended does not group "get…"; this codebase uses Get* for a real family.
        "prefix-groups": ["error", { "ignore": ["!get"] }],
    },
}
```

## Overrides: settings for some folders

```jsonc
{
    "overrides": [
        {
            "folders": ["src/generated/**", "src/legacy"],
            "reason": "Generated from the OpenAPI spec; its shape is the generator's.",
            "rules": { "max-files": "off", "prefix-groups": "off" },
        },
        {
            "folders": ["packages/*/src/components"],
            "reason": "Design-system components are many small siblings by design.",
            "rules": { "max-files": ["error", { "max": 60 }] },
            "naming": { "ignoreLeadingWords": ["base"] },
        },
    ],
}
```

- `folders` are globs matched against **folder** paths relative to the root (the root is `.`).
- `reason` is required, and is shown by `crowded-folders explain`. An override is a silence; a silence
  without a reason cannot be reviewed, and nobody knows a year later whether it still holds.
- Overrides apply in order, after the global settings; several can match one folder.
- An override in your configuration that matches no folder is reported as a warning
  (`config/unused-override`), so they are removed when the folder is.

## Globs

| Pattern       | Matches                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `fixtures`    | a file or folder called `fixtures` at any depth (no `/`: like `.gitignore`) |
| `/data`       | only the `data` at the root                                                 |
| `src/*.ts`    | `.ts` files directly in `src`                                               |
| `src/**/test` | `src/test`, `src/a/test`, `src/a/b/test`                                    |
| `*.{png,svg}` | either extension                                                            |
| `[!_]*`       | names not starting with `_`                                                 |

`exclude` matches a path or any folder above it: excluding `fixtures` leaves out everything inside.

## Naming: telling the tool how your files are named

Most repositories need none of this: the presets set it. It is for a convention the presets do not
know.

```jsonc
{
    "naming": {
        // Our tests are FooCheck.kt next to Foo.kt.
        "companions": ["Check$"],
        // Every model is prefixed with the product code: XYZOrder, XYZInvoice.
        "ignoreLeadingWords": ["xyz"],
        // Our numbered steps are a family: 01-intro, 01-setup.
        "groupNumericPrefixes": true,
    },
}
```

- **companions** are regular expressions removed from each stem, again and again until nothing
  changes, so `foo_linux_amd64_test` becomes `foo` with the Go preset.
- **ignoreLeadingWords** are skipped before reading what a file is about: `IUserService` is about
  `user` once `i` is ignored.
- `crowded-folders explain <folder>` prints, for every file, the stem, the words and the group the tool
  read. It is the quickest way to see whether a setting does what you meant.

## Configuration in JavaScript

```js
// crowded-folders.config.mjs
import { defineConfig } from 'crowded-folders';

export default defineConfig({
    extends: ['recommended', 'go'],
    overrides: process.env.CI
        ? []
        : [{ folders: ['scratch'], reason: 'local experiments', rules: { 'max-files': 'off' } }],
});
```

`defineConfig` only gives types. Prefer JSON when you can: it can be read by editors, by `$schema`,
and by people who do not run the code.

## Monorepos

One configuration at the root checks the whole repository, and overrides target packages:

```jsonc
{
    "extends": ["recommended"],
    "overrides": [
        { "folders": ["apps/web", "apps/web/**"], "reason": "React app", "naming": { "ignoreLeadingWords": ["use"] } },
        {
            "folders": ["services/**"],
            "reason": "Go services",
            "naming": { "companions": ["_test$"] },
            "rules": { "max-files": ["error", { "max": 30 }] },
        },
    ],
}
```

Or one configuration per package, each with its own `extends`, and the command run in each package
(the root is the configuration's folder). To check only some folders of a run, pass them:
`crowded-folders apps/web services/api`.

## Sharing a configuration

A shared configuration is a package (or a file) whose default export is a configuration:

```js
// @acme/crowded-folders-config/index.js
export default {
    extends: ['recommended'],
    rules: { 'max-files': ['error', { max: 15 }] },
};
```

```jsonc
{ "extends": ["@acme/crowded-folders-config"] }
```

It is resolved from the folder of the configuration that names it, so it has to be installed there
(a devDependency). A package that adds rules is a plugin: [plugins.md](plugins.md).
