---
date: 2026-10-06
title: Build System
---
# Build System

Riebeckite's Build System reads content such as Markdown plus the configuration
and generates the final web site. It supports [[incremental-build|incremental builds]]
that reuse the previous build result and process only what changed.

[Data provenance](./build-system/provenance.md) describes the build's inputs,
transforms, and outputs for observability.

## In this section

- [Data provenance](./build-system/provenance.md)
- [Incremental builds](./build-system/incremental.md)
- [Cache and commands](./build-system/cache-and-commands.md)

## Safe changes

When adding generated output, make its owner and cleanup behavior explicit. Do not silently write during validation or inspection. Cache keys must include every relevant version/input; raise a full-build fallback rather than reusing uncertain output. Keep failures observable and avoid deleting a previous successful state before replacement is known to be valid.

When the Build System or a plugin generates a new file, make explicit which
mechanism owns that file. In particular:

- make clear which mechanism generated the file
- remove old files that are no longer needed
- do not let validation commands such as `check` or `inspect` write files
  unintentionally
- reflect settings and version changes that affect the result in the cache
- do not reuse data that cannot be confirmed as safe to reuse
- still generate the correct result through a normal build even when reuse is
  not possible
- make a build failure observable
- keep the previous successful information until a new build succeeds

The basic principle is to **prioritize the correctness of the generated site
over build speed**.

Incremental build and the various caches exist to speed up the build. The
premise of Riebeckite's Build System is that the same correct web site can be
generated even if all of them are deleted.
