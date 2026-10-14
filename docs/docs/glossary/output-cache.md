---
title: Output Cache
sidebar:
  hidden: true
---

# Output Cache

The SSG output cache at `.riebeckite/ssg-output-cache.json` that stores rendered output routes and files for incremental SSG reuse. It is local-only and not meant to be shared between CI runners.

## Purpose

After building the current manifest, Core compares its output descriptors with the previous successful state. HonoX renders only affected content and plugin-page routes, restores unchanged generated output from the output cache, and removes outputs no longer owned by the site.

## Output Inventory Comparison

Core builds the output inventory (`.riebeckite/ssg-output-cache.json` contains a record of every generated output keyed by path, including content outputs, redirects, plugin-page outputs, and generated outputs). The current inventory is compared with the previous successful state to determine which outputs are affected (need regeneration), unchanged (can be reused), or removed. The build log reports an `SSG outputs` line with `rendered`, `reused`, and `removed` counts.

## Local-only

The output cache stays local because its build-time saving does not offset the transfer cost. Delete `.riebeckite/build/content-state.json` and `.riebeckite/ssg-output-cache.json` to force full output regeneration.

## Related terms

- [[ssg|SSG]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## Learn more

- [Build System](../framework/build-system.md)
