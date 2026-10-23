---
date: 2026-10-14
title: Slug
sidebar:
  hidden: true
---

# Slug

The internal lookup key for a note, used by the content index, the manifest, and the content graph. It is not the public URL; consumers read the permalink from the resolved public location instead.

## Slug versus permalink

| | Slug | Permalink |
| --- | --- | --- |
| Audience | Build internals | Public URL |
| Source | File path | Location resolution |
| Example use | `graph.incoming(slug)` | `<a href={permalink}>` |

## Keep them separate

A slug can change when a file moves, while the permalink follows the configured URL rules. Recomputing a URL from the slug bypasses redirects and localization, so read the [permalink](./permalink.md) instead.

## Slug type and resolution

The slug is the internal lookup key for a note, used by the content index, the manifest, and the content graph. It is typed as part of `ContentManifestEntry` (`packages/core/src/types/content_manifest.ts`) and mapped through the content index (`packages/core/src/content/content_index_builder.ts`).

Key properties:

- **Source**: Derived from the file path (relative to content root), but normalized to lowercase and with `.md` suffix removed
- **Stability**: Changes when the file moves to a new path; does not change when URL rules change
- **Resolution**: Looked up in the content index `Map<string, string>` where keys are lowercase slug suffixes and values are canonical slugs
- **Ambiguity**: If multiple notes share the same lowercase slug suffix, the key is removed from the index and reported as ambiguous

Example slug resolution:

```ts
// Content at "content/notes/HelloWorld.md" gets slug "notes/helloworld"
// The content index maps "notes/helloworld" → "notes/helloworld"
// A wikilink `[[HelloWorld]]` resolves via the index to the canonical entry
```

Example ambiguity diagnostic:

```ts
// If both "content/notes/foo.md" and "content/sub/foo.md" exist,
// the key "foo" is ambiguous and removed from the index.
// Link `[[foo]]` stays unresolved rather than pointing at the wrong note.
```
