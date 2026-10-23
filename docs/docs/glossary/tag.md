---
date: 2026-10-14
title: Tag
sidebar:
  hidden: true
---

# Tag

A tag groups content entries by a shared label, generating listing pages at `/tags/<slug>` with RSS/Atom/JSON feeds and related-tag navigation.

## How tags work

The `taxonomy()` plugin reads the manifest's public entries and groups them by `tags` frontmatter field.

Each unique tag value generates a term page at `/tags/<slug>`.

Tag pages include: entry list, RSS/Atom/JSON feeds, and related-tag navigation (clamped to `relatedLimit`).

## Tag page structure

A tag page renders as a generic HonoX catch-all route using the `taxonomy-term` page type.

The page includes a list of entries sharing that tag, with links through their resolved `permalink`.

Per-term feeds are written as static files through the build's generated-output sink.

## Related terms

```ts
taxonomy({
  tags: true,
  folders: true,
  related: true,
  relatedLimit: 8,
  feeds: { rss: true, atom: true, json: true },
  feedLimit: 50,
})
```

Set `tags: false` to disable tag generation. The `related` option enables co-occurrence-based navigation.

## Tag URL Structure
Each unique tag value generates a term page at `/tags/<slug>`. The tag base path can be configured via the `tagsBasePath` option in `taxonomy()`:

```ts
taxonomy({
  tagsBasePath: "/custom-tags",
})
```

The default base path is `/tags`. Tag pages provide entry lists, RSS/Atom/JSON feeds, and related-tag navigation.

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## Learn more

- [Taxonomy](../plugins/taxonomy.md)
