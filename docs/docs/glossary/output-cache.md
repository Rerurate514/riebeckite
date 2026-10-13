---
title: Output Cache
sidebar:
  hidden: true
---

# Output Cache

The SSG output cache at `.riebeckite/ssg-output-cache.json` that stores rendered output routes and files for incremental SSG reuse. It is local-only and not meant to be shared between CI runners.

## Purpose

After building the current manifest, Core compares its output descriptors with the previous successful state.
HonoX renders only affected content and plugin-page routes, restores unchanged generated output from the output cache, and removes outputs no longer owned by the site.

## Local-only

The output cache stays local because its build-time saving does not offset the transfer cost.
Delete `.riebeckite/build/content-state.json` and `.riebeckite/ssg-output-cache.json` to force full output regeneration.

## Related terms

- [[ssg|SSG]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## Learn more

- [Build System](../framework/build-system.md)
