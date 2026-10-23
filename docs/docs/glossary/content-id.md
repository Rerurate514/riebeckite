---
date: 2026-10-14
title: Content ID
sidebar:
  hidden: true
---

# Content ID

A stable identifier written in frontmatter that names a note independently of its slug and permalink. It survives file moves and URL changes, so it is the right key for external references.

## id versus slug versus permalink

| Identifier | Set by | Changes when |
| --- | --- | --- |
| `id` | The author, in frontmatter | Never, unless edited |
| slug | The file path | The file moves |
| permalink | Location resolution | The URL rules or config change |

## Content ID resolution

The `contentId` field in frontmatter (`packages/core/src/types/post_content.ts`) provides a stable identifier independent of slug and permalink. When an `id` is present in frontmatter, it is stored as `contentId` in the manifest entry (`packages/core/src/types/content_manifest.ts`) and exposed through `byContentId` map in the manifest (`packages/core/src/types/resolved_riebeckite_config.ts`).

Use cases for `contentId`:

- **External references**: When an outside system needs to point at a note and must keep working after the file is renamed or its URL changes, use the `contentId` rather than the slug or permalink.
- **Cross-collection links**: When linking between different content collections or external systems, the `contentId` survives file moves and URL changes.
- **Incremental build caching**: The `contentId` is part of the cache fingerprint calculation, so entries with the same `contentId` are correctly tracked across builds.

Example frontmatter with `id`:

```yaml
---
id: abc123
title: "Hello World"
tags: ["intro"]
---
```

Example lookup by content ID in code:

```ts
const entry = manifest.byContentId.get("abc123");
// entry.slug, entry.permalink, entry.frontmatter, etc.
```
