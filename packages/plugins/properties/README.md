# @riebeckite/plugin-properties

Render each note's frontmatter as an Obsidian-style property panel at build
time. No client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

When the content manifest is created, `properties()` renders a
`section.rb-properties[data-properties]` from every entry's frontmatter. By
default the panel is prepended (or appended) to the rendered note. With
`render: "slot"` the note HTML is left untouched and the panel is published on
`ContentManifestEntry.bodySlots.properties`, so the Site decides where to render
it. The frontmatter stays the single source of truth — there is nothing to write
in the Markdown body.

Values are rendered by type:

| Value | Output |
| ----- | ------ |
| Array | `ul.rb-properties__list` with one item per element |
| Tag key (`tags` / `tag`) or a value starting with `#` | `a.rb-properties__tag` linking to the site tag route |
| Boolean | `true` / `false` with `data-boolean` |
| Number | The number with `data-number` |
| ISO date string or `Date` | `<time datetime>` |
| `[[wikilink]]` or URL inside a string | Resolved link (wikilinks use the content index) |
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

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `title` | `string \| null` | `"Properties"` | Panel heading. `null` omits it |
| `position` | `"start" \| "end"` | `"start"` | Insert before or after the note body |
| `include` | `string[]` | unset | Render only these keys |
| `exclude` | `string[]` | `["publish", "permalink", "aliases", "redirect_from"]` | Keys to hide |
| `order` | `string[]` | unset | Display order for selected keys: listed keys first, then the rest in frontmatter order |
| `render` | `"html" \| "slot"` | `"html"` | `"html"` inserts at the start/end of the note; `"slot"` publishes on `bodySlots.properties` |
| `hideEmpty` | `boolean` | `true` | Skip `null`, `""`, `[]`, and `{}` values |
| `className` | `string` | `"rb-properties"` | Root CSS class |
| `collapsed` | `boolean` | `false` | Render inside a `<details>` element |

```ts
properties({
  title: "メタデータ",
  position: "end",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

### Rendering into a body slot

With `render: "slot"`, the plugin writes the panel to
`ContentManifestEntry.bodySlots.properties` and the Site route chooses where to
render it. Combine `include` and `order` to decide which keys are shown and in
what order:

```tsx
// app/components/article.tsx (site side)
<div
  class="article-properties"
  dangerouslySetInnerHTML={{ __html: propertiesHtml }}
/>;
```

```ts
properties({
  render: "slot",
  include: ["title", "created", "updated", "tags"],
  order: ["title", "created", "updated", "tags"],
});
```

The handoff follows the
[`ContentManifestEntry.bodySlots`](../../../docs/en/framework/honox-integration.md)
contract. A plugin never owns routes or the shell.

## Exports

- `properties(options?)` / `propertiesPlugin(options?)` — plugin factory
- `resolvePropertiesOptions(options?)` — default resolution
- `renderPropertiesPanel(frontmatter, options?, context?)` — pure renderer
- `buildTagHref(tag)` — tag route builder
- Types: `PropertiesOptions`, `PropertiesPosition`, `PropertiesRenderMode`, `ResolvedPropertiesOptions`, `PropertiesRenderContext`, `PropertiesLinkResolver`, `PropertiesMessage`

## See also

- [Plugin guide](../../../docs/en/reference/plugin-api.md)
