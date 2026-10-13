---
title: Frontmatter
sidebar:
  hidden: true
---

# Frontmatter

The YAML block at the top of a content file, parsed into typed metadata such as title, date, tags, and visibility. It also carries the stable id that identifies the note independently of its slug.

## Common fields

| Field | Purpose |
| --- | --- |
| `title` | Display title |
| `date` | Publish or sort date |
| `tags` | [Taxonomy](./taxonomy.md) values |
| `series` | [Series](./series.md) membership |
| `published` | Publish decision |
| `visibility` | Listed or [unlisted](./unlisted.md) |
| `aliases` | Extra link keys |
| `id` | Stable [content id](./content-id.md) |

## Parsing

Frontmatter is parsed before the Markdown body, so hooks and location resolution can read metadata first. Unknown fields stay available for plugins.
