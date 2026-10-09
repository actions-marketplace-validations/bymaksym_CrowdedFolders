# `single-file-folders`

A folder that holds one file and no sub-folders is a level of nesting with nothing to group.

**Off in `recommended`, warning in `strict`.** No options.

```text
src/utils/date/
  ⚠ warn  single-file-folders  holds only format.ts: a folder with nothing to group is one more level to open.
```

It is the other side of [`max-files`](max-files.md): a tool that says "split" pushes some people to
split too early. The former Angular style guide's "Flat" rule — "keep a flat folder structure as long
as possible" — and React's "avoid too much nesting" say the same.

It is off by default because many conventions put a single file in a folder on purpose: a route in
Next.js (`app/about/page.tsx`), a component folder with an `index.ts`, a Go package with one file.
