---
date: 2026-10-14
title: Discoverable
sidebar:
  hidden: true
---

# Discoverable

A publishing view that lists the entries allowed to appear in listings, feeds, and navigation. A routable but unlisted page is served at its URL yet kept out of this view.

## Discoverable versus routable

| View | Includes |
| --- | --- |
| routable | Every entry with a URL and an output |
| discoverable | Only entries allowed in listings and feeds |

## Used by

Listings, [feeds](./feed.md), and discovery widgets read this view, so an unlisted page never appears in them.

## ContentManifest discoverable view

The `ContentManifest` provides a `discoverableEntries` view that filters entries based on publishing state. Only entries with `routable: true` and `discoverable: true` appear in this view. This means:

- `visibility: "public"` entries are included
- `visibility: "unlisted"` entries are excluded (they are routable but not discoverable)
- `visibility: "draft"` and `visibility: "scheduled"` entries are excluded

The taxonomy plugin, series plugin, feeds, and navigation widgets all read from `discoverableEntries` so that unlisted pages never appear in listings or feeds, even though they are served at their URLs.

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  discoverableEntries: ContentManifestEntry[];
  // Entries where resolvePublishingState gives discoverable: true
}
```
