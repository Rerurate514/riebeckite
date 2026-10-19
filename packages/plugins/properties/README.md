# @riebeckite/plugin-properties

<!-- Generated from docs/docs/plugins/properties.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Render each note's frontmatter as an Obsidian-style property panel at build
time. No client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

When the content manifest is created, `properties()` renders a
`section.rb-properties[data-properties]` from every entry's frontmatter. The
note HTML is left untouched and the panel is published as part of the entry's
build-time output. The frontmatter stays the single source of truth — there is
nothing to write in the Markdown body.

Values are rendered by type:

| Value | Output |
| ----- | ------ |
| Array | `ul.rb-properties__list` with one item per element |
| Tag key (`tags` / `tag`) or a value starting with `#` | `a.rb-properties__tag` linking to the site tag route |
| Boolean | `true` / `false` with `data-boolean` |
| Number | The number with `data-number` |
| ISO date string or `Date` | `<time datetime>` |
| `[wikilink](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/glossary/wikilink.md)` or URL inside a string | Resolved link (wikilinks use the content index) |
| Nested object | A nested `<dl>` |

Values that cannot be rendered as structured HTML are emitted as escaped text
and reported as a `properties-unrenderable-value` warning.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { properties } from "@riebeckite/plugin-properties";

export default defineConfig({
  // ...
  plugins: [properties()],
});
```

`properties()` provides a `getProperties({ view, frontmatter, options? })`
helper that returns `PropertiesData`. The Site renders `<Properties data={data} />`
itself. `PropertiesOptions` accepts `title`, `include`, `exclude`, `order`,
`hideEmpty`, `className`, `collapsed` (no `render` option).

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `title` | `string \| null` | `"Properties"` | Panel heading. `null` omits it |
| `include` | `string[]` | unset | Render only these keys |
| `exclude` | `string[]` | `["publish", "permalink", "aliases", "redirect_from"]` | Keys to hide |
| `order` | `string[]` | unset | Display order for selected keys: listed keys first, then the rest in frontmatter order |
| `hideEmpty` | `boolean` | `true` | Skip `null`, `""`, `[]`, and `{}` values |
| `className` | `string` | `"rb-properties"` | Root CSS class |
| `collapsed` | `boolean` | `false` | Render inside a `<details>` element |

```ts
properties({
  title: "メタデータ",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

## Display

The plugin renders the properties panel at build time. The Site can render
the exported component anywhere in its layout:

```tsx
import { getProperties, Properties } from "@riebeckite/plugin-properties";
import { content } from "virtual:riebeckite/content";

const manifest = await content.getManifest();
const entry = manifest.entries[slug];
const data = getProperties({ view, frontmatter: entry.frontmatter, options });

return <Properties data={data} />;
```

The Site owns layout: it calls `getProperties` and renders `<Properties>` where
it wants the panel. A plugin never owns routes or the shell.

## Exports

- `properties(options?)` / `propertiesPlugin(options?)` — plugin factory
- `resolvePropertiesOptions(options?)` — default resolution
- `getProperties({ view, frontmatter, options? })` — resolves properties data
  for a given entry
- `renderPropertiesPanel(frontmatter, options?, context?)` — pure renderer
- `buildTagHref(tag)` — tag route builder
- Types: `PropertiesOptions`, `ResolvedPropertiesOptions`, `PropertiesRenderContext`, `PropertiesLinkResolver`, `PropertiesMessage`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
