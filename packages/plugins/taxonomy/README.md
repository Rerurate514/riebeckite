# @riebeckite/plugin-taxonomy

<!-- Generated from docs/docs/plugins/taxonomy.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Build-time tag and folder taxonomy for Riebeckite: listing data, per-term
RSS / Atom / JSON feeds, related-tag navigation, and SEO metadata. No
client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

`taxonomy()` reads the manifest's public entries and produces two sets of
listing terms with the Core collection contract (`buildContentCollections`):

- **Tag terms** group by `tags` under `/tags/<slug>`.
- **Folder terms** group by folder under `/folders/<path>`.

Entries always link through their resolved `permalink`; the plugin never
reconstructs a URL from a slug.

The plugin owns data, feeds, SEO, and the `/tags/<tag>` and `/folders/<path>`
page types. Per-term feeds are written as static files through the build's
generated-output sink. A site renders the page types through its generic
Riebeckite catch-all route; no taxonomy-specific application route is needed.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { taxonomy } from "@riebeckite/plugin-taxonomy";

export default defineConfig({
  // ...
  plugins: [
    taxonomy({
      tags: true,
      folders: true,
      related: true,
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `tags` | `boolean` | `true` | Generate tag terms |
| `folders` | `boolean` | `true` | Generate folder terms |
| `tagsBasePath` | `string` | `"/tags"` | Tag listing prefix |
| `foldersBasePath` | `string` | `"/folders"` | Folder listing prefix |
| `folderDepth` | `number` | `0` | Folder grouping depth; `0` keeps the full path |
| `minEntries` | `number` | `1` | Drop terms with fewer entries |
| `related` | `boolean` | `true` | Compute related-tag navigation |
| `relatedLimit` | `number` | `8` | Maximum related tags per tag |
| `feeds` | `{ rss?, atom?, json? }` | all `true` | Per-term feed formats |
| `feedLimit` | `number` | `50` | Maximum entries per feed |
| `resolveTitle` | `(context) => string` | `#value` / path | Custom term title |
| `className` | `string` | `"rr-taxonomy"` | Root CSS class of page fragments |
| `dataEndpoint` | `string` | `"/taxonomy/index.json"` | JSON data endpoint path |

## Data endpoint

The plugin registers one JSON endpoint (the endpoint contract is mounted by the
HonoX integration, so it never contains framework routing itself):

```
GET /taxonomy/index.json
```

```json
{
  "tags": [
    {
      "kind": "tag",
      "value": "featured",
      "title": "#featured",
      "path": "/tags/featured",
      "permalink": "/tags/featured",
      "count": 1,
      "entries": [{ "slug": "example", "permalink": "/notes/example", "title": "Example Note", "updated": null, "summary": "..." }],
      "related": [],
      "feeds": { "rss": "/tags/featured/feed.xml", "atom": "/tags/featured/atom.xml", "json": "/tags/featured/feed.json" }
    }
  ],
  "folders": []
}
```

The payload is a deterministic, JSON-safe projection: it never includes rendered
HTML, so it is safe to ship to an app route or a browser.

## Generated feeds

At build time the plugin emits one feed per term and format through
`context.output.emit`:

| Format | Path |
| ------ | ---- |
| RSS 2.0 | `/tags/<slug>/feed.xml` |
| Atom | `/tags/<slug>/atom.xml` |
| JSON Feed 1.1 | `/tags/<slug>/feed.json` |

Folder terms get the same files under `/folders/<path>/…`. Feed channels carry
their own term title and self link, so a tag subscription is distinguishable
from the site-wide feeds owned by `@riebeckite/plugin-seo`. Only published,
non-`noindex` entries reach the manifest's public view and therefore the feeds.
RSS and Atom term feeds expose entry summaries. JSON term feeds use the same
summary as `content_text` and do not duplicate rendered article HTML.

## Related tags

When `related` is enabled, each tag term carries tags that co-occur on the same
entries, ranked by shared-entry count then alphabetically, clamped to
`relatedLimit`. Related navigation is rendered by `renderTaxonomyPage`:

```html
<nav class="rr-taxonomy__related" aria-label="Related tags" data-rr-taxonomy-related>
  <ul>
    <li class="rr-taxonomy__related-item">
      <a class="rr-taxonomy__related-link" href="/tags/featured" data-rr-taxonomy-related-count="2">#featured</a>
    </li>
  </ul>
</nav>
```

## SEO

`buildTaxonomySeo(config, term)` returns `SeoMetadata` for a listing page. It
delegates to the configured Core `seo` extension point (for example
`@riebeckite/plugin-seo`) so titles, canonical URLs, and JSON-LD stay consistent
with the rest of the site, and falls back to a minimal object when no SEO
provider is registered.

## Folder index notes

Folder entry resolution is owned by
[`@riebeckite/plugin-folder-pages`](../folder-pages/README.md), so taxonomy only
generates tag and folder terms from the manifest's public view. Enable that
plugin when a note at `<folder>/README.md` or `<folder>/index.md` should become
the folder's landing page.

## Page types

`taxonomy()` registers two page types. `taxonomy-term` renders one tag or
folder page and includes feed discovery `<link rel="alternate">` metadata.
`taxonomy-index` renders the all-tags list at `tagsBasePath` and the
all-folders list at `foldersBasePath`, linking to every term. Both derive
their SSG paths and resolver from the public manifest, so unpublished entries
never appear on a tag, folder, or index page.

Use `pluginPageSsgParams(content)` and `resolveRiebeckiteRoute(content, path)`
from `@riebeckite/honox/server` in the site's generic catch-all route. This is
the same wiring used for every plugin page type.

## Style

The package ships `style.css` with the stable `rr-taxonomy` root hook and
`--rr-taxonomy-*` tokens (falling back to `--rb-*`). Register it like any other
plugin stylesheet:

```ts
import "@riebeckite/plugin-taxonomy/style.css";
```

## Exports

- `taxonomy(options?)` — plugin factory
- `taxonomyPlugin` — alias of `taxonomy`
- `resolveTaxonomyOptions(options?)` — apply option defaults
- `resolveTaxonomyOptionsFromConfig(config)` — read resolved options back from a config
- `buildTaxonomyIndex(entries, options)` — build tag and folder terms
- `serializeTaxonomyIndex(index)` / `serializeTaxonomyTerm(term)` — JSON-safe projections
- `renderTaxonomyPage(term, options)` / `renderRelatedTerms(term, options)` — page fragments
- `renderTaxonomyIndexPage(kind, terms, options)` — all-tags/all-folders page fragment
- `renderTermFeed(config, term, format, limit?)` / `buildFeedHeadTags(term)` — per-term feeds
- `buildTaxonomySeo(config, term)` — listing-page SEO metadata
- `slugifyTaxonomyValue(value)` — URL/file slug
- `buildTaxonomyAbsoluteUrl(config, pathOrUrl)` — absolute URLs
- Types: `TaxonomyOptions`, `ResolvedTaxonomyOptions`, `TaxonomyTerm`, `TaxonomyIndex`, `TaxonomyPage`, `TaxonomyTermData`, `TaxonomyIndexData`

## Limitations

- Taxonomy is fixed at build time. A full rebuild always recomputes correctly.
- Per-term feeds are static build output; the fixed JSON data endpoint is the
  only runtime surface. A dev server does not enumerate per-term feed files.
- Terms only reflect the manifest's public view; unpublished or `noindex`
  entries are excluded.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [Content system](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/framework/content-system.md)
