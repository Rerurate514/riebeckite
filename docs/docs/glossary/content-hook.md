---
title: Content hook
sidebar:
  hidden: true
---

# Content hook

Content hooks join named phases of content processing: from config resolved through content loaded, post-parsed, post-processed, content graph, to manifest creation and diagnostics.

## Processing phases

The content processing pipeline orders hooks as: `setup → buildStart → config resolved → public locations resolved → content loaded → Markdown/HTML pipeline → post parsed → post processed → content graph → manifest created → diagnostics → build end`.

## Hook usage

Only use hooks for phases you genuinely need. Avoid reconstructing later-stage information in earlier hooks; for example, do not rebuild manifest information inside `onContentLoaded`.

## Related terms

- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle hook]]
- [[hook-context|Hook context]]
- [[renderer|Renderer]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Build Dependency Contract](../framework/build-dependency.md)
