---
title: Build State
sidebar:
  hidden: true
---

# Build State

The record of the previous build, stored under the build directory, that holds entries, fingerprints, dependencies, and output changes. The next build reads it to compute what to reprocess.

## Role

- Persists fingerprints and dependencies between builds.
- Lets the next build compute an incremental change set.

## Related terms

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## Learn more

- [Build System](../framework/build-system.md)
