---
title: Permalink
sidebar:
  hidden: true
---

# Permalink

The resolved canonical public URL for a note. It is the single source of truth for links, feeds, sitemaps, and metadata, and it comes from location resolution rather than being recomputed from the slug.

## Resolution order

1. Core resolves a default location from the logical path.
2. Plugin location hooks may adjust it, for example to add a folder prefix or a locale.
3. The result is stored on the entry as its permalink.

## Permalink type and usage

The permalink is typed as `string` on `ContentManifestEntry` (`packages/core/src/types/content_manifest.ts`) and stored as part of the `ContentPublicLocation` (`packages/core/src/types/content_manifest.ts`). It is the single source of truth for links, feeds, sitemaps, and metadata.

Key aspects:

- **Resolution**: Generated during location resolution via `ContentLocationResolver` (`packages/core/src/content/content_location.ts`), which may call plugin `resolveContentLocations` hooks
- **Stability**: Once set, the permalink should not be recomputed from the slug or file path
- **Read, do not rebuild**: Links, feeds, sitemaps, and metadata should read the permalink from the resolved entry. Rebuilding a URL from the slug or the file path skips redirects and localization and can produce a 404

Example permalink values:

```ts
// Default: "/notes/hello/"
// With folder prefix: "/blog/notes/hello/"
// With locale: "/ja/notes/hello/"
```

Example correct usage in a template:

```tsx
<a href={entry.permalink}>Link to entry</a>
// ❌ Do not: <a href={buildUrlFromSlug(entry.slug)}>
```

## Related terms
