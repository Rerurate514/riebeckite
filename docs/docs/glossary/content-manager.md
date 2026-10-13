---
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

The component that turns scanned entries into a finished manifest. It resolves public locations, runs the Markdown and plugin pipeline, and builds the content graph and query indexes.

## Role

- Coordinates processing and records the result in the manifest.
- Owns location resolution and manifest construction, not file reading.

## Related terms

- [[content-source|Content Source]]
- [[manifest|Manifest]]
- [[content-graph|Content Graph]]
- [[slug|Slug]]

## Learn more

- [Content System](../framework/content-system.md)
