# @riebeckite/plugin-breadcrumbs

<!-- Generated from docs/docs/plugins/breadcrumbs.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Build-time breadcrumb navigation derived from the note's public URL hierarchy.
The plugin provides the trail data and a `<Breadcrumbs />` component for the
Site, and enriches the page with a hierarchical BreadcrumbList JSON-LD schema.
No client-side JavaScript is required.

[日本語](./README_ja.md)

## Live example

The breadcrumb trail above the article — **Riebeckite / Docs / Plugins / Breadcrumbs** — is this plugin's output. It is built from the page's folder and title, and the same trail is emitted as `BreadcrumbList` JSON-LD.

## Overview

`breadcrumbs()` reads the entry's slug, splits it into segments, and produces a
trail that always starts at the site home:

- `Home / folder / sub-folder / Note` for `folder/sub-folder/note`
- `Home / Note` for a note at the site root

Intermediate segments are resolved against the manifest first: when the folder
has an index note of its own (a note with the folder slug), that note's title
is used for the crumb, otherwise the segment is title-cased. The final crumb is
the note itself and links to its permalink.

The plugin does not modify the entry's HTML. The reference Site renders
`<Breadcrumbs />` above the article; the component reads the current entry and
builds the same trail at render time. Feeds keep the article body unchanged.

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

## Display

When the Site renders `<Breadcrumbs />` above the article, the trail appears on every eligible page. This page shows the live navigation for its own path.

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-breadcrumbs/style.css";
```

## Exports

- `breadcrumbs(options?)` — plugin factory
- `Breadcrumbs` — Site component for the trail
- `getBreadcrumbs(...)` — data helper for the current entry
- `resolveBreadcrumbsOptions(options?)` — apply option defaults
- `buildBreadcrumbItems({ manifest, entry, config, homeLabel })` — build the trail
- `renderBreadcrumbNav(items, options)` — render the navigation HTML
- `buildBreadcrumbHeadTag(schema)` / `hasBreadcrumbHeadTag(headTags)` — head-tag helpers
- `buildBreadcrumbJsonLd(config, items)` — build the JSON-LD object
- `BREADCRUMBS_ATTRIBUTE` / `BREADCRUMBS_PLUGIN_NAME` — constants
- Types: `BreadcrumbsOptions`, `ResolvedBreadcrumbsOptions`, `BreadcrumbItem`, `BreadcrumbsProps`

## Limitations

- The trail is fixed at build time. A full rebuild always recomputes correctly.
- Only the slug hierarchy is considered; folder ordering from frontmatter or
  series plugins is intentionally ignored.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
