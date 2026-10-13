---
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
