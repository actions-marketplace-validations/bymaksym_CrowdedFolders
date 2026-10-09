# `redundant-prefix`

Modules inside a folder do not repeat the folder's name.

**Off in `recommended`, error in `strict`.** Options and defaults: [configuration.md](../configuration.md#redundant-prefix).

```text
render/
  render-json.ts  render-text.ts  render.ts

  ✖ error  redundant-prefix  2 modules repeat the folder's name "render" (render-json, render-text):
           the folder already says it.
```

`render/json.ts` says "render" once. It is what [`prefix-groups`](prefix-groups.md) leads to: once the
`render-*` files are in `render/`, the prefix has nothing left to do.

- A module named exactly like the folder (`render/render.ts`) is its main file, and is fine.
- A plural folder accepts the singular: `users/user-list.ts` repeats "user".
- `--moves` suggests the shorter name in the file's own convention: `render-json.ts` → `json.ts`,
  `RenderText.cs` → `Text.cs`, `render_json_test.go` → `json_test.go`.

It is off by default because some conventions repeat the name on purpose: NestJS (`cats/cats.service.ts`
is one module, so it is not reported, but `cats/cats-admin.service.ts` would be), Flutter
(`auth/auth_repository.dart`) and Angular's file names, which mirror class names
(`user-profile/user-profile-avatar.ts`). Turn it on when your convention is the short name.

## Options

| Option | Default |                                                                                       |
| ------ | ------- | ------------------------------------------------------------------------------------- |
| `min`  | `2`     | How many modules have to repeat the name before it is reported; `1` reports each one. |
