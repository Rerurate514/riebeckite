---
title: Build State
sidebar:
  hidden: true
---

# Build State

The record of the previous build, stored under the build directory, that holds entries, fingerprints, dependencies, and output changes.

## Location and content

Stored at `.riebeckite/build/content-state.json`.
Holds entries, fingerprints, dependencies, pipeline fingerprint, manifest entries, outputs, and external dependencies.
The next build reads it to compute an incremental change set.

## Version and validity

Version is `CONTENT_BUILD_STATE_VERSION` (currently 12).
A missing, incompatible, or malformed state causes a full build path.
State is updated only after a successful build; a failed build never corrupts the previous good state.

## Related terms

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## Learn more

- [Build System](../framework/build-system.md)
