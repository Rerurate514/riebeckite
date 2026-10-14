---
title: Alias
sidebar:
  hidden: true
---

# Alias

An alternative name for a note, recorded in the manifest as an extra lookup key. Aliases resolve wikilinks to the same note without changing its slug or permalink, and a name used twice becomes ambiguous.

## Setting aliases

```yaml
---
aliases: [Getting Started, Quick Start]
---
```

## Resolution and ambiguity

Each alias is registered in the [content index](./content-index.md) as a key that resolves to this note. If two notes claim the same alias, the key becomes ambiguous and links using it are reported.

## Alias registration in content index

Aliases are extracted from frontmatter via `extractFrontmatterAliases` (`packages/core/src/content/content_metadata.ts`) and registered in `ContentManifest.byAlias`. The `contentIndex` uses lowercased keys for lookup, and aliases follow the same lowercased resolution. When multiple entries share the same alias key, the key is moved to `contentIndexAmbiguities` and is intentionally absent from the normal index, so links using that key stay unresolved rather than picking a target by discovery order.

```ts
// From packages/core/src/content/content_metadata.ts
export function extractFrontmatterAliases(markdown: string): string[] {
  // ...extracts `alias` and `aliases` from frontmatter
}

// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  byAlias: Map<string, ContentManifestEntry[]>;
  contentIndex: Map<string, string>;
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
}
```

If an alias is ambiguous, wikilinks using `[[alias-name]]` will not resolve and will be reported as diagnostics. Single-alias keys resolve normally to their target note.
