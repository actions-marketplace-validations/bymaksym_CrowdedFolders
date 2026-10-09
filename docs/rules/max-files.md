# `max-files`

A folder holds at most `max` modules (or files). Past that it is scrolled, not read.

**On in `recommended`:** error, 20 modules. Options and defaults: [configuration.md](../configuration.md#max-files).

## What counts

By default a **module**: a file together with its companions, the files that share its stem. These
are one module, not four:

```text
user-profile.ts  user-profile.html  user-profile.scss  user-profile.spec.ts
```

So an Angular component weighs what a Go file weighs. `count: "files"` counts every file instead.

Files whose name starts with a dot (`.gitignore`, `.editorconfig`) are not counted unless
`dotfiles: true`: they are tool settings that have to live where the tool looks.

## Why 20

It is the median 95th percentile of folder sizes over the 30 repositories of the
[field trial](../field-trial.md): about the biggest folder in twenty of a typical project. Small,
tidy projects (ripgrep, httpx, axum) have none over it.

Where a guide gives a number, its preset uses it: `angular` uses 10 (the former Angular style guide:
"Consider creating sub-folders when a folder reaches seven or more files… when a folder has ten or
more files, it may be time"); `vue` allows 100 in `components/` ("very large apps (e.g. 100+
components)"). The root gets 40 in `recommended`: manifests, lockfiles and configs live there because
their tools look for them there.

## When it fires

```text
src/components/
  ✖ error  max-files  34 modules, over the limit of 20: split it into folders by what the files are about.
```

Split by what the files are _about_ (`checkout/`, `catalog/`), not by what they _are_
(`components/`, `services/`): Angular's guide says it outright, and a folder per type just moves the
crowd. [`prefix-groups`](prefix-groups.md) usually points at the first folder to make.

## Options

| Option     | Default                                            |                                                                                                              |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `max`      | `20`                                               | How many it may hold.                                                                                        |
| `count`    | `"files"` in the rule, `"modules"` in every preset | What is counted.                                                                                             |
| `dotfiles` | `false`                                            | Whether dot-files count.                                                                                     |
| `hint`     | `""`                                               | Added to the message: what a folder costs in this ecosystem (presets use it: "In Go a folder is a package"). |
