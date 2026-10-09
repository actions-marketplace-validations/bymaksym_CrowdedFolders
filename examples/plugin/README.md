# crowded-folders-plugin-example

An example plugin for [crowded-folders](../../README.md): one rule, `example/generic-names`, and one
preset, `example/recommended`. Copy this folder to start your own; [docs/plugins.md](../../docs/plugins.md)
explains every part.

```jsonc
// crowded-folders.config.json
{
    "plugins": ["crowded-folders-plugin-example"],
    "extends": ["recommended", "example/recommended"],
    "rules": { "example/generic-names": ["error", { "names": ["utils", "helpers"] }] },
}
```
