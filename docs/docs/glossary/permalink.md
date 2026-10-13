---
title: Permalink
sidebar:
  hidden: true
---

# Permalink

The resolved canonical public URL for a note. It is the single source of truth for links, feeds, sitemaps, and metadata, and it comes from location resolution rather than being recomputed from the slug.

## Resolution order

1. Core resolves a default location from the logical path.
2. Plugin location hooks may adjust it, for example to add a folder prefix or a locale.
3. The result is stored on the entry as its permalink.

## Read it, do not rebuild it

Links, [feeds](./feed.md), sitemaps, and metadata should read the permalink. Rebuilding a URL from the slug or the file path skips redirects and localization and can produce a 404.
