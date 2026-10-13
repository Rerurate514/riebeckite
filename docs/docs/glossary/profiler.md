---
title: Profiler
sidebar:
  hidden: true
---

# Profiler

The build-time measurement of where time goes, from content processing to plugin hooks and output generation. It reads trace spans and reports timings for the build.

## Role

Measures time spent in build phases.
Reports timings from recorded spans.

## CLI usage

Run `riebeckite profile` to collect traces and display a performance report.
`riebeckite profile --full` to measure without incremental reuse.

## Related terms

- [[trace-span|Trace Span]]
- [[logger|Logger]]
- [[build|Build]]

## Learn more

- [Observability](../framework/observability.md)
