---
title: Build
sidebar:
  hidden: true
---

# Build

The Riebeckite process that processes content, resolves locations, runs plugins, builds the manifest and graph, and writes the output.

## Build flow

1. Resolve the configuration and plugins
2. Read content such as Markdown
3. Run plugin transformations
4. Decide which pages and links are published
5. Collect site-wide information and required assets
6. Emit assets such as images and browser-side code
7. Build the web site with HonoX

## Full build vs incremental build

Use `--full` to process everything without using the previous build information.
An incremental build reuses the previous build result and processes only what changed.
The previous build information is stored in `.riebeckite/build/content-state.json`.

## Build state

Build state is application-scoped at `.riebeckite/build/content-state.json`.
It is an optimization, not a source of truth. A missing, incompatible, or unsafe state causes an initial/full path.
State is saved only after a successful build, so a failure retains the prior valid state.

## Related terms

- [[incremental-build|Incremental Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## Learn more

- [Build System](../framework/build-system.md)
