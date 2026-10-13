---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

The abstraction that discovers and reads content for the rest of the pipeline. The standard implementation reads a filesystem or an Obsidian vault, so the Content Manager never walks the filesystem directly.

## Role

- Scans locations and produces content entries for the Content Manager.
- Keeps content acquisition separate from processing and location resolution.

## Related terms

- [[content-manager|Content Manager]]
- [[content-entry|Content Entry]]
- [[root|Root]]

## Learn more

- [Content System](../framework/content-system.md)
