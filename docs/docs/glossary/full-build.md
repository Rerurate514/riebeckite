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

## When `--full` is Triggered

`--full` is automatically selected when:
- No previous build state exists (first build)
- The previous build state version is incompatible with the current version
- The pipeline fingerprint has changed, making the previous state unsafe to reuse
- Cache schema version mismatch prevents valid cache entry lookup
- External dependency failures prevent incremental processing

Even when `--full` is specified, the same correct website is generated; the difference is that all content is processed from scratch without reusing incremental state, which is useful for comparing build times or isolating problems with incremental behavior.

## Related terms

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[check|Check]]

## Learn more

- [Build System](../framework/build-system.md)
