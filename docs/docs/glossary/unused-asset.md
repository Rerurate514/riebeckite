---
date: 2026-10-14
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

## Asset Tracking

Assets are tracked through the content's `assets` field and link references within content. The diagnostics plugin monitors asset references during the build and reports unreferenced assets. An asset is considered unused if it is not referenced in any content's frontmatter `assets` field or through link references (`!`alt`` or wiki link syntax).

The diagnostics plugin reports unused assets as `unused-asset` code diagnostics, including the asset path and suggestions for remediation.

### Example

```sh
# Diagnostics report unused assets (example output)
# unused-asset: content/images/header.png (not referenced in any content)
# unused-asset: files/config.yaml (not referenced in any content)

# Identify unreferenced assets via inspector
riebeckite inspect content --list
# (check which assets are tracked by each content entry)
```
## Related terms

- [[orphan|Orphan]]
- [[asset|Asset]]
- [[glossary/content|Content]]

## Learn more

- [Diagnostics](../framework/diagnostics.md)
