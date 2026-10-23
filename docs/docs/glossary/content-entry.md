---
date: 2026-10-14
title: Content Entry
sidebar:
  hidden: true
---

# Content Entry

One resolved content item in the manifest, identified by slug. It carries the permalink, public location, frontmatter, publishing state, HTML, and plugin-contributed data.

## What an entry carries

- `slug` — the internal key.
- `publicLocation` — the resolved [permalink](./permalink.md), redirects, and metadata.
- `frontmatter` — parsed metadata.
- `html` — the rendered body.
- Plugin-contributed data such as data helpers and JSX components that the Site renders.

## Slug versus permalink

The slug identifies the entry inside the build; the permalink is the public URL. Consumers that link to the entry read the permalink from the entry, not the slug.

## Content Manifest Entry Fields

Each `ContentManifestEntry` carries the following fields, all of which are populated during content processing:

| Field | Type | Description |
| --- | --- | --- |
| `slug` | `string` | The internal key identifying the entry. |
| `contentId` | `string | undefined` | An optional source-authored stable content identity, independent of slug, permalink, aliases, and redirects. |
| `permalink` | `string` | The resolved public URL (e.g. `/blog/my-post/`). |
| `publicLocation` | `ContentPublicLocation` | The slug, permalink, language, redirects, and metadata for this entry. |
| `title` | `string` | The page title. |
| `aliases` | `readonly string[]` | Explicit redirect aliases. |
| `frontmatter` | `PostFrontmatter` | Parsed frontmatter metadata. |
| `publishing` | `ResolvedPublishingState` | The publishing state (e.g. `published`, `unlisted`, `draft`, `scheduled`). |
| `html` | `string` | The rendered HTML body. |
| `tags` | `string[]` | Tags associated with this entry. |
| `links` | `ContentLink[]` | Resolved markdown/wikilink references within the content. |
| `backlinks` | `string[]` | Auto-computed backlinks from the content graph. |
| `assets` | `ContentAsset[]` | Assets declared by plugins for this entry. |

Consumers typically access `permalink` for links, `frontmatter` for metadata, and plugin-contributed data for layout composition.

---

## How Pages Read Entry Data

Pages and templates access entry data through the manifest's lookup maps. The most common patterns are:

- **Permalink resolution**: Read `entry.permalink` directly, or use `byPermalink` map for slug-to-URL lookups.
- **Frontmatter**: Access `entry.frontmatter` for page-level metadata (title, date, tags, etc.).
- **Head tags**: Plugins provide `entry.headTags`; the site shell renders them in the `<head>`.
- **Assets**: `entry.assets` contains `ContentAsset` entries declared by plugins; the site copies or references them during output.

Example entry access in a site template:

```ts
const entry = manifest.bySlug.get("my-post");
if (entry) {
  const url = entry.permalink;
  const title = entry.title;
  const meta = entry.frontmatter;
  }
```
