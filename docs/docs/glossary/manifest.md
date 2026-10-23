---
date: 2026-10-14
title: Manifest
sidebar:
  hidden: true
---

# Manifest

The build-time record of all content, with entries, public views, lookup maps, the content graph, and diagnostics. Pages, runtime queries, incremental builds, and inspection all read from the manifest.

## What the manifest holds

| Field | Contents |
| --- | --- |
| `entries` | Every processed [Content Entry](./content-entry.md) |
| `publicEntries` | Entries safe to publish |
| `discoverableEntries` | Entries allowed in listings and feeds |
| `bySlug`, `byPermalink`, `byAlias` | Lookup maps |
| `graph` | The [content graph](./content-graph.md) |
| `diagnostics` | Collected warnings and errors |

## Manifest Lookup Maps

The `ContentManifest` provides several specialized views for different access patterns:

| View | Contents | Typical use |
| --- | --- | --- |
| `bySlug` | `Map<string, ContentManifestEntry>` | Look up an entry by its slug. |
| `byPermalink` | `Map<string, ContentManifestEntry>` | Look up an entry by its permalink URL. |
| `byAlias` | `Map<string, ContentManifestEntry[]>` | Find entries by their alias/redirect paths. |
| `byRoutablePermalink` | `Map<string, ContentManifestEntry>` | Look up only routable entries (public + unlisted, excluding draft/scheduled). |
| `byTag` | `Map<string, ContentManifestEntry[]>` | Group entries by tag for taxonomy pages. |
| `byAsset` | `Map<string, ContentManifestEntry[]>` | Group entries by asset for asset manifest generation. |
| `publicRedirects` | `Map<string, ContentRedirect & { slug: string }>` | Public redirects with owning entry slug. |

These views are generated during the build and are **pure projections** — they read entry data from the manifest without requiring any filesystem access. For example, to find an entry by permalink:

```ts
const entry = manifest.byPermalink.get("/blog/my-post/");
```

## Graph and Diagnostics

The `graph` field holds a `ContentGraph` instance, enabling queries such as `graph.outgoing(slug)`, `graph.incoming(slug)`, and `graph.neighbors(slug)`. This is used by backlink displays, related-links sections, and internal link validation.

The `diagnostics` field is an array of `Diagnostic` objects collected during content processing. Each diagnostic includes a `level` (`info`, `warn`, `error`), `source`, `message`, and `range` (source position). Downstream consumers (page generation, runtime queries, inspection) read from the manifest exclusively — nothing downstream needs to touch the filesystem.

---

## The boundary between stages

Content processing produces the manifest; page generation, runtime queries, [incremental builds](./incremental-build.md), and inspection consume it. Nothing downstream needs to touch the filesystem.
