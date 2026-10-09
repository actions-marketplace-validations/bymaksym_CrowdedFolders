# Plugins

A plugin adds rules and presets. It is a package (or a local file) whose default export has this
shape:

```js
export default {
    meta: { name: 'crowded-folders-plugin-acme', namespace: 'acme', version: '1.0.0' },
    rules: { 'no-generic-names': rule },
    presets: { recommended: preset },
};
```

A configuration loads it and uses what it adds by `namespace/name`:

```jsonc
{
    "plugins": ["crowded-folders-plugin-acme"],
    "extends": ["recommended", "acme/recommended"],
    "rules": { "acme/no-generic-names": ["error", { "names": ["utils"] }] },
}
```

[examples/plugin](../examples/plugin) is a complete plugin to copy: one rule, one preset, typed with
JSDoc, no build step.

## A rule

```js
import { defineRule } from 'crowded-folders';

export const noGenericNames = defineRule({
    meta: {
        description: 'Folders are not named after nothing in particular: utils, helpers, common.',
        url: 'https://github.com/acme/crowded-folders-plugin-acme#no-generic-names',
        defaultOptions: { names: ['utils', 'helpers', 'common'] },
        // JSON Schema of the options: checked when the configuration loads.
        options: {
            type: 'object',
            additionalProperties: false,
            properties: { names: { type: 'array', items: { type: 'string' } } },
        },
    },
    check(folder, { options, report }) {
        if (options.names.includes(folder.name.toLowerCase())) {
            report({ message: `"${folder.name}" says nothing about what is inside.`, files: folder.files });
        }
    },
});
```

`check` is called once per folder, with:

| `folder.`          |                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `path`             | Relative to the root, `/`-separated; the root is `.`.                                                   |
| `name`, `depth`    | The last segment (`.` for the root); how deep it is (the root is 0).                                    |
| `files`, `folders` | Names of its files and sub-folders, sorted.                                                             |
| `modules`          | Its files grouped: `{ stem, files, words, subject }` — see [how-it-works.md](how-it-works.md).          |
| `naming`           | The naming in effect here: `companions` (RegExp[]), `ignoreLeadingWords` (Set), `groupNumericPrefixes`. |

`options` are your `defaultOptions`, then what presets and the configuration set, then overrides for
this folder. Lists accumulate and `"!x"` removes, as everywhere.

`report({ … })` takes:

| Field               |                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `message`           | What is wrong and what to do, in one or two sentences.                                                                     |
| `key`               | Tells apart two problems of the same rule in one folder. It is part of what a suppression remembers, so it must be stable. |
| `measured`, `limit` | The number that broke the limit, and the limit. A suppression lets `measured` stay or drop, not grow.                      |
| `files`             | File names in the folder the problem is about; the first is where annotations and SARIF point.                             |
| `moves`             | `{ from, to }` paths relative to the root, printed by `--moves`. Never applied.                                            |

Helpers exported for rules: `splitWords`, `stemOf`, `groupKeyOf`, `modulesOf`.

**A rule must be pure:** no file reads, no network, no state between calls. It sees paths only, the
same as the built-in rules, and that is what keeps the tool fast and safe to run on any repository.

## A preset

```js
import { definePreset } from 'crowded-folders';

export const recommended = definePreset({
    description: "Acme's layout: features in src/features, 12 modules per folder.",
    sources: [{ title: 'Acme engineering handbook: folders', url: 'https://acme.example/handbook/folders' }],
    detect: { dependencies: ['@acme/framework'] },
    config: {
        extends: ['recommended'],
        rules: { 'max-files': ['error', { max: 12 }], 'acme/no-generic-names': 'warn' },
    },
});
```

`sources` is required: a preset says where its criterion comes from. If it is your own opinion, say so
in the description — the built-in `strict` does.

## Testing it

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint } from 'crowded-folders';
import plugin from './index.js';

test('reports a utils folder', async () => {
    const result = await lint({
        config: { rules: { 'acme/no-generic-names': 'error' } },
        rules: { 'acme/no-generic-names': plugin.rules['no-generic-names'] },
        files: ['src/utils/a.ts', 'src/user/b.ts'],
    });
    assert.deepEqual(
        result.findings.map(finding => finding.folder),
        ['src/utils'],
    );
});
```

`files` stands in for a repository, so a test needs no folders on disk.

## Publishing

- **Name:** `crowded-folders-plugin-<name>` or `@scope/crowded-folders-plugin[-<name>]`, with the keyword
  `crowded-folders-plugin` so it can be found.
- **`peerDependencies`:** `"crowded-folders": "^1.0.0"`, not a dependency: the plugin uses the user's copy.
- **`exports`:** a `"."` entry with an `import` or `default` condition. The package is resolved from the
  folder of the configuration that names it, so users install it as a devDependency next to it.
- **Namespace:** lowercase letters, digits and `-`. Two plugins with the same namespace is an error.

## Security

A plugin is code, and it runs when the configuration loads — as an ESLint plugin does. Install the ones
you would install as a devDependency anyway, and pin them. A JSON configuration without `plugins` runs
no code from outside this package.
