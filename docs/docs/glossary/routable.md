---
date: 2026-10-14
title: Routable
sidebar:
  hidden: true
---

# Routable

A publishing view that lists the entries the site serves at a URL, including unlisted ones. Routing and output generation use this view rather than the discoverable one.

## What the view contains

Every entry that receives a URL and an output. An [unlisted](./unlisted.md) page is routable: it is served at its URL even though it is kept out of listings.

## Used by

Routing and [output generation](./output-inventory.md) read this view. A page that is not routable produces no output.

## ContentManifest routing views

The `ContentManifest` maintains three key views of entries:

- `publicEntries` — all entries the publication boundary marks as public or unlisted
- `byRoutablePermalink` — a map of `permalink => entry` for only routable entries (public and unlisted, excluding draft and scheduled-before)
- `byPermalink` — the full map including drafts and scheduled entries

Routing code reads from `byRoutablePermalink` so that unlisted pages are served at their URLs while remaining excluded from discovery surfaces. The `discoverableEntries` view further filters to entries allowed in listings and feeds, so an unlisted page is routable but not discoverable.

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  publicEntries: ContentManifestEntry[];
  byRoutablePermalink: Map<string, ContentManifestEntry>;
  byPermalink: Map<string, ContentManifestEntry>;
  discoverableEntries: ContentManifestEntry[];
}
```

## Publishing state and routability

A entry's routing status is determined by `resolvePublishingState` (`packages/core/src/content/publishing.ts`):

- `visibility: "public"` → `routable: true, discoverable: true`
- `visibility: "unlisted"` → `routable: true, discoverable: false`
- `visibility: "draft"` → `routable: false, discoverable: false`
- `visibility: "scheduled"` → `routable: false, discoverable: false` (until the publish time)
