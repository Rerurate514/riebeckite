---
date: 2026-10-14
title: Logical Path
sidebar:
  hidden: true
---

# Logical Path

The location of a content file inside the content root, expressed relative to that root. Riebeckite keeps the logical path stable and maps it to a public path separately.

## Logical path

A file at `content/notes/hello.md` has the logical path `notes/hello`. The logical path is what the content system reasons about; it is not necessarily the public URL.

## Mapping to public

Location resolution maps the logical path to a [public path](./public-path.md). A [folder page](./folder-page.md) or a permalink rule can change the mapping without moving the file.

## Content location types

The resolved public location is typed as `ContentPublicLocation` (`packages/core/src/types/content_manifest.ts`). Its shape includes:

- **`slug`** — the internal content slug, matching the logical path
- **`permalink`** — the canonical public URL for the note
- **`language`** — optional language code (for localized content)
- **`redirects`** — optional array of `ContentRedirect` for URL redirects
- **`metadata`** — optional `Record<string, string>` for additional metadata

Example `ContentPublicLocation`:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  language: "ja",
  redirects: ["/old-url/"],
  metadata: { author: "tanaka" },
}
```

The logical path itself (e.g., `notes/hello` from `content/notes/hello.md`) is the relative path inside the content root. It is resolved to a public path through location resolution, which may involve:

- Default mapping: `slug` → `/${slug}/`
- Plugin-adjusted paths via `resolveContentLocations` hook
- Locale prefix insertion for localized content
- Folder page rules that map directory indices to different URLs

This separation of logical path and public path allows URL structure changes without moving content files, and enables locale-specific routing while keeping the internal content identity stable.
