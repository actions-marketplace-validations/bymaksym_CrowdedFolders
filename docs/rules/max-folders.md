# `max-folders`

A folder holds at most `max` sub-folders: a long list of folders is a drawer too.

**Off in `recommended`, error at 20 in `strict`.** Options and defaults: [configuration.md](../configuration.md#max-folders).

```text
src/features/
  ✖ error  max-folders  34 subfolders, over the limit of 20 (account, admin, analytics, …):
           group them by what they are about.
```

It is off by default because some folders are long lists by nature — `packages/` of a monorepo,
`routes/`, one folder per locale — and it has not been measured on the [field trial](../field-trial.md)
yet. Turn it on with overrides for those folders.

## Options

| Option | Default |                                   |
| ------ | ------- | --------------------------------- |
| `max`  | `30`    | How many sub-folders it may hold. |
