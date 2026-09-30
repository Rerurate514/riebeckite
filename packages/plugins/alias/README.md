# @riebeckite/plugin-alias

Turns Obsidian `aliases` / `alias` frontmatter into site-local redirect URLs, so a note can be reached through its alternate names without changing its canonical permalink.

[Japanese](./README_ja.md)

## What it does

When a vault note has frontmatter like

```md
---
title: Old Note
aliases:
  - legacy-note
  - "old notes"
---
```

the plugin registers redirects such as:

- `/legacy-note` → the note's canonical permalink
- `/old%20notes` → the note's canonical permalink

Redirects are written into the build-time manifest and resolved by HonoX at request time. No client-side JavaScript is required.

## Setup

```ts
import { defineConfig } from "@riebeckite/core";
import { aliasPlugin } from "@riebeckite/plugin-alias";

export default defineConfig({
  // ...
  plugins: [aliasPlugin()],
});
```

It composes with the `permalink` plugin. `alias` augments already-resolved public locations through `extendContentLocations`, so it never overrides or re-derives the canonical permalink, whatever decided it.

```ts
plugins: [permalinkPlugin(), aliasPlugin()],
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | `301 \| 302 \| 307 \| 308` | `308` | HTTP status used for generated redirects |

## Alias normalization

An alias is treated as an alternate note name and mapped to a path under the site root:

- A leading `/` is ignored (`Old` and `/Old` both become `/Old`).
- Path separators are allowed (`archive/Old` → `/archive/Old`).
- Each segment is percent-encoded with the same rules as request paths, so non-ASCII and spaces work as-is.
- An alias that cannot become a URL is skipped with a warning:
  - empty, or only `.` / `..` segments
  - containing `#`, `?`, or `\`
  - containing `//` (an empty segment)
  - containing malformed percent escapes

## Diagnostics

| Code | Severity | Meaning |
| --- | --- | --- |
| `alias-invalid` | warning | The alias cannot be converted into a URL path. |
| `alias-collision` | warning | The alias path collides with another note's canonical permalink or an existing redirect. |

A colliding alias is not registered; the existing path wins.

## Limitations

- Redirects are decided at build time; add or change aliases and rebuild the site.
- SSG does not emit dedicated redirect HTML files. Redirects are resolved by the server (`resolveContentRoute` in HonoX).
- Aliases are not part of the content graph (backlinks); only links written in the Markdown count.

## Exports

- `aliasPlugin(options?)` / `alias(options?)` — the plugin factory
- `resolveAliasPath(alias)` — pure alias-to-path helper (returns `null` when invalid)
- Types: `AliasOptions`, `AliasRedirectStatus`, `ResolvedAliasOptions`

## Related

- [Plugin system](../../../docs/en/reference/plugin-api.md)

## See also

- [Plugin guide](../../../docs/en/reference/plugin-api.md)
