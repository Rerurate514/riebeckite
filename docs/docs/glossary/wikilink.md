---
title: WikiLink
sidebar:
  hidden: true
---

# WikiLink

The `[[link]]` syntax that connects notes and creates relationships in the content graph. Riebeckite resolves it through the content index, and an unresolved link stays as a diagnostic.

## Syntax

```md
[[target]]              # link by name
[[target|label]]        # link with a label
[[target#Heading]]      # link to a heading
[[glossary/theme]]      # explicit path, for ambiguous names
```

## Resolution

The target is looked up in the [content index](./content-index.md) after lowercasing. A match creates a graph edge; a miss renders as a broken link and is reported as a diagnostic.

## Alias and content index resolution

Wikilink resolution goes through the `contentIndex` in `ContentManifest` (`packages/core/src/types/content_manifest.ts`). The index is built by `ContentIndexBuilder` and lowercases all keys. Aliases registered in `byAlias` are also resolved during lookup, so an alias can target a note without changing its slug or permalink. If multiple entries share the same alias key, the key becomes ambiguous and links using it are reported as diagnostics in `contentIndexAmbiguities`.

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  contentIndex: Map<string, string>; // lowercase key → slug
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
  byAlias: Map<string, ContentManifestEntry[]>;
}
```

A wikilink `[[Target]]` first checks the `contentIndex` for the lowercased `"target"`. If found as a single match, the link resolves to that note. If the key is ambiguous, resolution fails and a diagnostic is emitted. If not found at all, the link stays as-is and is reported as an unresolved link.
