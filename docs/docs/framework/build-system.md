---
date: 2026-10-06
title: Build System
---
# Build System

Riebeckite's Build System reads content such as Markdown plus the configuration
and generates the final web site.

A normal build roughly performs the following work:

1. Resolve the configuration and plugins
2. Read content such as Markdown
3. Run plugin transformations
4. Decide which pages and links are published
5. Collect the information the whole site needs
6. Emit assets such as images and browser-side code
7. Build the web site with [[framework/honox-integration|HonoX]]

Riebeckite also supports an [[incremental-build|incremental build]] that reuses the previous
build result and processes only what changed.

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
