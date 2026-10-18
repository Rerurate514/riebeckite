---
title: Output Cache
sidebar:
  hidden: true
---

# Output Cache

The SSG output cache at `.riebeckite/ssg-output-cache.json` that stores rendered output routes and files for incremental SSG reuse. It is restored between CI runs so incremental SSG works in GitHub Actions; a cache that fails its checks is discarded.

## Purpose

After building the current manifest, Core compares its output descriptors with the previous successful state. HonoX renders only affected content and plugin-page routes, restores unchanged generated output from the output cache, and removes outputs no longer owned by the site.

## Output Inventory Comparison

Core builds the output inventory (`.riebeckite/ssg-output-cache.json` contains a record of every generated output keyed by path, including content outputs, redirects, plugin-page outputs, and generated outputs). The current inventory is compared with the previous successful state to determine which outputs are affected (need regeneration), unchanged (can be reused), or removed. The build log reports an `SSG outputs` line with `rendered`, `reused`, and `removed` counts.

## Reuse decision

Core restores unchanged output from the cache only when every condition holds:

- The build state is valid and an output change set is available.
- The change set does not require full regeneration, meaning no external dependency failed and no output carries an `unknown` dependency.
- The output cache was restored and passed its integrity check (schema version, entry files, checksums).
- The app fingerprint and the client manifest fingerprint match the cached values.
- Every unchanged output is either site-owned or present in the cache.

The SSG metrics record the outcome in `outputCacheDecision` (each individual condition) and `outputCacheRejectionReason`. The reason is `null` when output is reused, and otherwise one of `change-set-unavailable`, `full-regeneration-required`, `output-cache-missing-or-invalid`, `app-fingerprint-changed`, `client-manifest-fingerprint-changed`, or `unchanged-output-not-cached`. `fullRegenerationRequired` in the same metrics is `true` whenever the cache was rejected.

This decision is separate from the CLI no-change fast path, which additionally requires that no plugin needs a manifest hook or a generated output plan.

## Persistence

The generated GitHub Actions workflow restores the output cache (`.riebeckite/ssg-output-cache.json`, its `.riebeckite/ssg-output-cache.entries` directory, and the `.riebeckite/ssg-output-cache.fast-path.json` sidecar) together with the content cache and build state, so CI reuses rendered output between runs. It is safe to transfer because Riebeckite validates the restored state and re-renders every output when it does not match. Delete `.riebeckite/build/content-state.json` and `.riebeckite/ssg-output-cache.json` to force full output regeneration, and see [GitHub Actions](../guides/deployment/github-actions.md) for the workflow details.

## Related terms

- [[ssg|SSG]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## Learn more

- [Build System](../framework/build-system.md)
