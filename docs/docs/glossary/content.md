---
title: Content
sidebar:
  hidden: true
---

# Content

A content item after Markdown parsing and plugin processing. It carries frontmatter, rendered HTML, and a resolved public location, so Riebeckite works with the processed item rather than the raw file.

## The processed item, not the file

Riebeckite reads a file, parses it, runs it through the plugin pipeline, and resolves where it will live on the site. Everything after that point is content: the [entry](./content-entry.md), its location, and its relationships.

Code that queries content reads the [manifest](./manifest.md), not the filesystem.

## Life of a content item

1. A [Content Source](./content-source.md) discovers and reads the file.
2. The [Content Manager](./content-manager.md) parses it and runs the pipeline.
3. Location resolution assigns a [permalink](./permalink.md).
4. The item is recorded as a [Content Entry](./content-entry.md) in the manifest.
