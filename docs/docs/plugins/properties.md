# Properties

Render each note's frontmatter as an Obsidian-style property panel at build
time. No client-side JavaScript is required.

[日本語](./properties.ja.md)

## Overview

When the content manifest is created, `properties()` renders a
`section.rb-properties[data-properties]` from every entry's frontmatter. The
note HTML is left untouched and the panel is published on
`ContentManifestEntry.bodySlots["article.metadata"]`, so the Site decides where
to render it. The frontmatter stays the single source of truth — there is
nothing to write in the Markdown body.

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

### Rendering the metadata slot

The plugin writes the panel to `ContentManifestEntry.bodySlots["article.metadata"]`.
The Site route passes `bodySlots` to its article component and chooses the
metadata position in its layout. Combine `include` and `order` to decide which
keys are shown and in what order:

```tsx
// app/components/article.tsx (site side)
import type { ContentBodySlots } from "@riebeckite/core";
import { ContentSlot } from "@riebeckite/honox/ui";

function SiteArticle({ bodySlots }: { bodySlots?: ContentBodySlots }) {
  return (
    <ContentSlot
      slots={bodySlots}
      name="article.metadata"
      class="site-article__metadata"
    />
  );
}
```

```ts
properties({
  include: ["title", "created", "updated", "tags"],
  order: ["title", "created", "updated", "tags"],
});
```

The handoff follows the
[`ContentManifestEntry.bodySlots`](../framework/honox-integration.md)
contract. A plugin never owns routes or the shell.

## Exports

- `properties(options?)` / `propertiesPlugin(options?)` — plugin factory
- `resolvePropertiesOptions(options?)` — default resolution
- `renderPropertiesPanel(frontmatter, options?, context?)` — pure renderer
- `buildTagHref(tag)` — tag route builder
- Types: `PropertiesOptions`, `ResolvedPropertiesOptions`, `PropertiesRenderContext`, `PropertiesLinkResolver`, `PropertiesMessage`

## See also

- [Plugin guide](../reference/plugin-api.md)
