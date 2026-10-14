---
title: Public Location
sidebar:
  hidden: true
---

# Public Location

Where a note is published, combining the internal slug and the canonical permalink with optional redirects and metadata. It is the resolved result that the manifest exposes for each entry.

## Public location shape

A public location combines the internal slug and the canonical permalink with optional redirects and metadata. It is the resolved result that the manifest exposes for each entry, typed as `ContentPublicLocation` (`packages/core/src/types/content_manifest.ts`).

Standard shape:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/"],
  metadata: { /* optional */ },
}
```

The `slug` field matches the content's internal slug. The `permalink` field is the canonical public URL. The optional `redirects` array contains `ContentRedirect` entries (`packages/core/src/types/content_manifest.ts`) that point older URLs at the canonical permalink. The optional `metadata` field allows plugins or integrations to attach additional key-value information.

## Redirects and metadata

A plugin can attach alias URLs or redirects next to the canonical location. The permalink stays canonical; redirects point older URLs at it. This is managed through the manifest's `publicRedirects` and `redirects` maps, which are populated during `buildManifest` in `packages/core/src/content/content_manager.ts`.

Example manifest entry with redirects and metadata:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/", "/hello/"],
  metadata: { author: "tanaka", lastModified: "2024-01-01" },
}
```

## Redirects and metadata

A plugin can attach alias URLs or [redirects](./redirect.md) next to the canonical location. The permalink stays canonical; redirects point older URLs at it.
