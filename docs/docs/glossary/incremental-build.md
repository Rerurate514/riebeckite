---
title: Incremental Build
sidebar:
  hidden: true
---

# Incremental Build

A build mode that regenerates only what changed, using content dependencies and the stored build state.

## Role

Avoids reprocessing unchanged content and output.
Relies on recorded dependencies and build state.

## How it works

Checks what changed since the previous build and processes only what is needed.
Previous build information is stored in `.riebeckite/build/content-state.json`.
When the previous information does not exist, cannot be used, or is determined unsafe, a full build is run.

## State safety

The same site can be generated correctly even without the speed-up information from incremental state.
A missing, incompatible, or unsafe state causes a full build path.

## Related terms

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## Learn more

- [Build System](../framework/build-system.md)
