---
title: Feed
sidebar:
  hidden: true
---

# Feed

A machine-readable list of published content, such as RSS, Atom, or JSON Feed. Feeds draw from the discoverable entries and use each entry's permalink.

## What feeds use

- The [discoverable](./discoverable.md) entries, so unlisted pages stay out.
- Each entry's [permalink](./permalink.md), never a URL rebuilt from the slug.
- Title, date, and description from frontmatter.

## Formats

| Format | Typical use |
| --- | --- |
| RSS | Widest reader support |
| Atom | Stricter, well-defined |
| JSON Feed | Feeds for programmatic use |
