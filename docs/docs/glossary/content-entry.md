---
title: Content Entry
sidebar:
  hidden: true
---

# Content Entry

One resolved content item in the manifest, identified by slug. It carries the permalink, public location, frontmatter, publishing state, HTML, and plugin-contributed data.

## What an entry carries

- `slug` — the internal key.
- `publicLocation` — the resolved [permalink](./permalink.md), redirects, and metadata.
- `frontmatter` — parsed metadata.
- `html` — the rendered body.
- Plugin-contributed data such as body slots and head tags.

## Slug versus permalink

The slug identifies the entry inside the build; the permalink is the public URL. Consumers that link to the entry read the permalink from the entry, not the slug.
