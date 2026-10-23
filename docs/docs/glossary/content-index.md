---
date: 2026-10-14
title: Content Index
sidebar:
  hidden: true
---

# Content Index

The lowercase name-to-note map used to resolve wikilinks and embeds. A name that matches more than one note is left out and reported as a diagnostic instead of resolving to the wrong target.

## Keys and suffixes

For a note at `guides/localization.md`, the index registers every path suffix: `localization`, `guides/localization`, and the full path. A bare `[[localization]]` therefore resolves, and so does `[[guides/localization]]`.

Frontmatter aliases are registered as additional keys.

## Ambiguity

If two notes register the same key, the key is removed from the index and reported. The link stays unresolved rather than pointing at the wrong note.

To link an ambiguous name on purpose, use the explicit path form:

```md
[[glossary/theme|theme]]
```

## Content index structure

The content index is of type `ContentIndexBuild` (`packages/core/src/content/content_index_builder.ts`), returned by `ContentIndexBuilder.build()` or `resolveContentIndex()`. It contains:

- **`index`** — a `Map<string, string>` mapping lowercase slug suffixes to their canonical content path. A key that matches a single candidate resolves to it; keys matching multiple candidates are intentionally absent (ambiguous).
- **`ambiguities`** — a `ReadonlyMap<string, readonly string[]>` mapping ambiguous keys to their sorted list of candidate entries.

Example index build output:

```ts
{
  index: new Map([
    ["hello", "notes/hello"],
    ["world", "notes/world"],
  ]),
  ambiguities: new Map([
    ["tags", ["notes/tag1", "notes/tag2"]], // multiple notes with "tags" slug suffix
  ]),
}
```

The index is built by iterating all content entries, collecting lowercased path suffixes (including frontmatter aliases), and collapsing candidates via `resolveContentIndex`. If a key matches more than one note, it is removed from the index to prevent incorrect resolution.

## Related terms
