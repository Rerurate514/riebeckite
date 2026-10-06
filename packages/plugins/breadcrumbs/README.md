# @riebeckite/plugin-breadcrumbs

Build-time breadcrumb navigation derived from the note's slug hierarchy. For
every published entry the plugin inserts a `<nav>` at the top of the rendered
HTML and enriches the page with a hierarchical BreadcrumbList JSON-LD schema.
No client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

`breadcrumbs()` reads the entry's slug, splits it into segments, and produces a
trail that always starts at the site home:

- `Home / folder / sub-folder / Note` for `folder/sub-folder/note`
- `Home / Note` for a note at the site root

Intermediate segments are resolved against the manifest first: when the folder
has an index note of its own (a note with the folder slug), that note's title
is used for the crumb, otherwise the segment is title-cased. The final crumb is
the note itself and links to its permalink.

The plugin injects the nav into the manifest entry's HTML. Core synchronizes
that HTML with the content the route renders, so the nav appears on generated
pages and in feeds.

## JSON-LD

`breadcrumbs()` contributes the hierarchical BreadcrumbList as an
`entry.headTags` `<script type="application/ld+json">` so the Site shell can
render it in the document `<head>` (the reference Riebeckite app renders
`entry.headTags` in `_renderer.tsx`). Item URLs are made absolute against the
configured site `baseUrl`.

When the `seo` plugin is also enabled it would emit its own two-level
BreadcrumbList (`Home / Note`) inside the article JSON-LD. Pass the page's
`headTags` to the seo extension and it detects the BreadcrumbList this plugin
contributed and omits its own placeholder, so the page carries a single
BreadcrumbList entity without any Site-side coupling. Set `jsonLd: false` to
stop this plugin from emitting one instead.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { breadcrumbs } from "@riebeckite/plugin-breadcrumbs";

export default defineConfig({
  // ...
  plugins: [breadcrumbs()],
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `homeLabel` | `string` | site title | Home crumb label |
| `className` | `string` | `"rb-breadcrumbs"` | Root CSS class |
| `ariaLabel` | `string` | `"Breadcrumbs"` | Accessible nav name |
| `separator` | `string` | `"/"` | Text between crumbs |
| `jsonLd` | `boolean` | `true` | Emit the BreadcrumbList script |

```ts
breadcrumbs({
  homeLabel: "Blog",
  separator: "›",
});
```

## Output

```html
<nav class="rb-breadcrumbs" data-breadcrumbs aria-label="Breadcrumbs">
  <ol>
    <li class="rb-breadcrumbs__item">
      <a class="rb-breadcrumbs__link" href="/">Blog</a>
      <span class="rb-breadcrumbs__separator" aria-hidden="true">/</span>
    </li>
    <li class="rb-breadcrumbs__item">
      <a class="rb-breadcrumbs__link" href="/folder">Folder</a>
      <span class="rb-breadcrumbs__separator" aria-hidden="true">/</span>
    </li>
    <li class="rb-breadcrumbs__item">
      <span class="rb-breadcrumbs__current" aria-current="page">Note</span>
    </li>
  </ol>
</nav>
```

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-breadcrumbs/style.css";
```

## Exports

- `breadcrumbs(options?)` — plugin factory
- `breadcrumbsPlugin` — alias of `breadcrumbs`
- `resolveBreadcrumbsOptions(options?)` — apply option defaults
- `buildBreadcrumbItems({ manifest, entry, config, homeLabel })` — build the trail
- `renderBreadcrumbNav(items, options)` — render the navigation HTML
- `buildBreadcrumbJsonLd(config, items)` — build the JSON-LD object
- Types: `BreadcrumbsOptions`, `ResolvedBreadcrumbsOptions`, `BreadcrumbItem`

## Limitations

- The trail is fixed at build time. A full rebuild always recomputes correctly.
- Only the slug hierarchy is considered; folder ordering from frontmatter or
  series plugins is intentionally ignored.

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.en.md)
