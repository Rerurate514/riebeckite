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

## Profile Report

The profiler report separates plugin-cache activity from persistent-content-cache activity. It reports content-cache hits, misses, and bypasses together with the reason for each miss (for example `no-entry` or `dependency-changed`) and each bypass (for example an l10n safe bypass), so a warm build that is not reusing entries can be explained without reading cache internals.

### Diagnostics measurement

The Profiler shows the duration of the `diagnostics.run` span, and also the number of findings diagnostics produced:

- total
- error
- warning
- info

This lets you see how long diagnostics took and how many problems they reported at the same time:

```
diagnostics.run
├─ duration
├─ total
├─ error
├─ warning
└─ info
```

If diagnostics account for most of the build time, that is a signal to investigate the phase further.

### Example

```sh
# Collect trace and display performance report
riebeckite profile

# Without incremental reuse (full build path)
riebeckite profile --full
```
## Related terms

- [[trace-span|Trace Span]]
- [[logger|Logger]]
- [[build|Build]]

## Learn more

- [Observability](../framework/observability.md)
