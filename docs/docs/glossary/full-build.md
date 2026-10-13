---
title: Full Build
sidebar:
  hidden: true
---

# Full Build

A build that runs without reusing previous incremental state, processing all content from scratch.

## When to use

Use `--full` to reproduce a build or to isolate problems with incremental behavior.
Useful for comparing build times or when an incremental build result looks suspicious.

## Command

`riebeckite build --full`
or
`pnpm exec riebeckite build --full`

## Related terms

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[check|Check]]

## Learn more

- [Build System](../framework/build-system.md)
