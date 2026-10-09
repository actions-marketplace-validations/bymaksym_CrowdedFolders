# Using it from code

```js
import { lint } from 'crowded-folders';

const result = await lint({ cwd: '/path/to/repo' });
for (const finding of result.findings) {
    console.log(finding.folder, finding.rule, finding.message);
}
```

The package is ESM with TypeScript types. Everything below is exported from `crowded-folders`; nothing
else under `dist/` can be imported (`exports` closes it), so nothing else is part of the API.

## `lint(options?)`

Checks a repository the way the command does and returns the findings, without printing or writing
anything. Suppressions are not applied: they are the command's business.

| Option   | Default                                                                    |                                                                                  |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `cwd`    | `process.cwd()`                                                            | Where to look for the configuration and the repository.                          |
| `config` | found from `cwd` upwards                                                   | A configuration object, or the path of a configuration file.                     |
| `root`   | the configuration's folder, else the top of the git repository, else `cwd` | The folder checked.                                                              |
| `files`  | asked to git, or read from the disk                                        | Paths relative to the root. Pass them to check a list without touching the disk. |
| `rules`  | `{}`                                                                       | Extra rules by full name, as a plugin would add them (handy for testing a rule). |

Returns `{ findings, folderCount, fileCount, root }`. A `Finding` is:

```ts
interface Finding {
    rule: string; // 'max-files', 'acme/no-generic-names', 'config/unused-override'
    severity: 'error' | 'warn';
    folder: string; // relative to the root; the root is '.'
    message: string;
    key: string | undefined; // the prefix, for prefix-groups
    measured: number;
    limit: number | undefined;
    files: readonly string[]; // relative to the root
    moves: readonly { from: string; to: string }[];
    url: string | undefined; // the rule's documentation
}
```

A configuration that is wrong throws a `ConfigError` with `origin` (the file) and `problems`
(`{ at, message }[]`).

## For configurations and plugins

| Export                                                             |                                                                |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `defineConfig(config)`                                             | Types a configuration written in JavaScript.                   |
| `definePlugin(plugin)`, `definePreset(preset)`, `defineRule(rule)` | Type a plugin and its parts ([plugins.md](plugins.md)).        |
| `BUILT_IN_PRESETS`, `BUILT_IN_RULES`                               | Everything that comes with the package, by name.               |
| `configSchema(rules, presets)`                                     | The JSON Schema of a configuration (what `schema.json` holds). |

## Lower level

For tools that bring their own file list and configuration — an editor extension, a bot:

| Export                                            |                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `runEngine({ files, config, rules, only? })`      | Runs the rules over a list of paths with a resolved configuration. Pure: no disk, no process. |
| `explainFolder(input, path)`                      | What `crowded-folders explain` shows, as data.                                                |
| `mergeLayer(base, config, origin, own)`           | Lays a configuration over another (`extends` is the caller's job).                            |
| `splitWords`, `stemOf`, `modulesOf`, `groupKeyOf` | How names are read ([how-it-works.md](how-it-works.md)).                                      |

Everything under `runEngine` runs in a browser or a worker: it imports nothing from Node.

## Versioning

Until `1.0.0`, a minor version may change the API and the limits of the presets; a patch never does.
After it, a limit that goes down — a run that passed and now fails — is a major change.
