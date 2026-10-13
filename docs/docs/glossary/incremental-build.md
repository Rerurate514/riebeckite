---
title: Incremental Build
sidebar:
  hidden: true
---

# Incremental Build

A build mode that regenerates only what changed, using content dependencies and the stored build state. It reuses unchanged content and output when the declared inputs have not changed.

## Role

- Avoids reprocessing unchanged content and output.
- Relies on recorded dependencies and build state.

## Related terms

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/build-dependency|Build Dependency]]

## Learn more

- [Build System](../framework/build-system.md)
