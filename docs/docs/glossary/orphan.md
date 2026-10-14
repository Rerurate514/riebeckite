---
title: Orphan
sidebar:
  hidden: true
---

# Orphan

Content or assets that are not referenced by any published page or other content. Orphans may indicate removed content that still exists, or content that should be cleaned up.

## Detection

Content not linked from any other content and not listed in the manifest.
Assets not referenced by any content's frontmatter or content.

## Handling

Orphans do not cause build failures but may indicate stale content.
Use `check` or `doctor` to diagnose broader project health.
Remove orphaned content or assets if they are no longer needed.

## Orphan Detection via Diagnostics

Orphan detection is enabled through the diagnostics configuration. When enabled, diagnostics reports isolated entries without stopping the build. The diagnostics plugin checks content graph reachability: content not linked from any other content and not listed in the manifest is flagged as an orphan.

### Example

```sh
# Enable orphan reporting in diagnostics
# (configure via diagnostics plugin settings)

# Orphan report output (example)
# 3 orphan notes detected:
#   - note-404 (no incoming links, not in manifest)
#   - note-draft (linked only in draft folder, excluded from publish)
# Use `inspect content --list` to see which entries are unreachable.
```
## Related terms

- [[unused-asset|Unused Asset]]
- [[glossary/content|Content]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more

- [Diagnostics](../framework/diagnostics.md)
