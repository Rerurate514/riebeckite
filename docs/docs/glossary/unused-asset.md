---
title: Unused Asset
sidebar:
  hidden: true
---

# Unused Asset

An asset (image, file, etc.) that is not referenced by any content's frontmatter or content. Unused assets may be safely removed to reduce output size.

## Tracking

Assets are tracked through content's `assets` field and link references.
An asset not tracked anywhere is considered unused.

## Cleanup

Unused assets do not affect correctness but can be removed for size optimization.
Use `doctor` or `inspect` to identify assets not referenced in the published site.

## Related terms

- [[orphan|Orphan]]
- [[asset|Asset]]
- [[glossary/content|Content]]

## Learn more

- [Diagnostics](../framework/diagnostics.md)
