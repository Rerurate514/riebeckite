# Content System

## Two explicit responsibilities

`ContentSource` is the boundary for finding and reading source data. It owns scanning, reading, identity, and source metadata such as mtime, size, ETag, or hashes. `FileSystemContentSource` is the normal local implementation.

`ContentManager` owns the meaning of that data: parsing, Markdown/HTML pipeline execution, post processing, plugin orchestration, manifest creation, and content-graph construction. It should not grow direct filesystem behavior that bypasses `ContentSource`.

## Processing model

```text
scan/read source
  -> resolve public locations        (default resolver + plugin hooks)
  -> parse post -> process post -> create manifest -> graph
                        |
                        `--- plugin lifecycle/content hooks ---'
```

Public locations are resolved before any content that needs a URL is processed, so a consumer never has to invent one. Plugin hooks observe or extend defined phases such as configuration resolution, content loaded, parsed/processed posts, manifest creation, and build start/end. Keep source I/O, semantic interpretation, and rendering distinct so a remote source can replace the filesystem source without changing Core policy.

## Public location and URLs

A content entry separates two notions of identity:

- **slug** — the internal lookup key used by `contentIndex`, the manifest `bySlug` map, the content graph, and application-level selection keys such as `/explore?note=<slug>`.
- **permalink** — the resolved canonical public URL used in article links, feeds, sitemaps, and metadata.

They are distinct. A consumer that needs a public URL reads `ContentManifestEntry.permalink` (also available as `entry.publicLocation`); it must not build a URL from a slug or filesystem path. Turning a slug into a URL is the Core default resolver's job alone.

Resolution is a single, stateless pipeline:

1. Core seeds every entry with the official default resolver, `resolveDefaultContentLocation(content)`, where `content` is a `ContentLocationInput` (`slug`, `path`, `markdown`). The default policy is `index` -> `/` and every other entry -> `/{slug}`. This is the Core default public-location policy, not a compatibility fallback.
2. Each enabled plugin may replace locations through the optional `resolveContentLocations` hook, which receives the `ContentLocationInput` list and returns `ContentPublicLocation` values. Plugin-specific URL strategies stay inside the plugin.
3. `ContentManager.getContentLocations()` returns the resolved `ReadonlyMap<string, ContentPublicLocation>`. A `ContentPublicLocation` carries the canonical `permalink`, optional `redirects`, and optional opaque `metadata` that Core does not interpret.

The manifest stores the resolved result: `ContentManifestEntry.permalink` and `.publicLocation`, plus the `byPermalink` index and the `redirects` map. The content graph and `readOnlyContentGraph(source, locations)` consume those resolved entries rather than deriving URLs. If a public location is not resolved for an entry, Core raises an explicit error instead of falling back to a slug-derived URL.

## Manifest, graph, and runtime

The manifest is the generated content representation used by the application. The content graph represents relationships and can be extended through the plugin graph contract. Reading a runtime manifest is not an explicit build. Incremental build state belongs only to the explicit build path and is never a mutable Worker runtime dependency.

## Content queries

Core exposes a portable query layer over resolved manifest entries:

- `queryContentEntries(entries, spec)` filters by tags, folder, frontmatter, and date range, applies one or more sort keys, and slices the result with `limit`/`offset`.
- `queryContentPage(entries, spec)` applies the same selection and returns the page slice together with `page` metadata (`page`, `pageCount`, `hasPrevious`, `hasNext`); `resolveContentQueryPagination(total, spec)` computes that metadata alone.
- `groupContentEntries(entries, groupBy, options)` runs the same selection and groups the result by tags, folder, date granularity (`year`/`month`/`day`), or a frontmatter field.

Both functions operate on `ContentManifestEntry` values, so links use the resolved `permalink`; a query never builds a public content URL from a slug. Applications and plugins compose these functions to build listing pages and taxonomy views, while Core keeps ownership of manifest and graph construction rather than routing.

## Content collections

`buildContentCollections(entries, definitions)` turns the same query selection into listing collections. A definition declares a `kind`, a `groupBy` (tags, folder, date, or a frontmatter field), a site-local `basePath`, optional `filter`/`sort`/`order` values, and optional `resolveTitle`/`resolvePath` builders. Every generated `ContentCollection` carries the group `value`, the resolved `path`, a `title`, and its `entries` in query order.

This is the shared mechanism behind taxonomy, folder, and archive listings. A `tag` definition groups by `tags` under `/tags`; an `archive` definition groups by date under `/archive`; both are produced by the same call. Routing stays in the application, while the collection contract and the query engine stay in Core. Listing entries still link through `ContentManifestEntry.permalink` and never construct a URL from a slug.

A definition may set `pageSize` to split a collection across pages. Each page is emitted as its own `ContentCollection` whose `path` is the collection path plus `/page/<n>` for later pages, and its `page` metadata carries `current`, `count`, `size`, `total`, `previousPath`, and `nextPath` for building navigation.

## Correctness rules

- Preserve canonical content identity across source, manifest, and graph.
- Treat slug and permalink as separate concepts: obtain public URLs only from the resolved `ContentPublicLocation`.
- Treat source metadata as change evidence, not universally reliable truth.
- Make publication/exclusion policy visible in configuration.
- Return diagnostics for recoverable user-facing problems; do not silently omit content.
- Keep graph extensions deterministic for identical inputs.

See [Configuration](configuration.md), [Build system](build-system.md), and [Plugin system](plugin-system.md).
