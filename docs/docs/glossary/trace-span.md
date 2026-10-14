---
title: Trace Span
sidebar:
  hidden: true
---

# Trace Span

A timed unit of build work. Traces divide build work into spans and record their duration. Span names should be stable (e.g., `content.load`, `plugins.run`, `diagnostics.run`, `application.build`).

## Structure

A trace has a parent span (e.g., `build`) and child spans for each unit of work.
Always close spans on both success and failure.

## Naming conventions

Use stable span names that can be compared between builds.
Avoid names that change every run due to input file names.

## Span Structure

A trace span is represented by the `TraceSpan` type with a name, start time, duration, status, and optional attributes:

```ts
type TraceSpan = Readonly<{
  name: string;
  startTime: number;
  durationMs: number;
  status: "ok" | "error";
  attributes: TraceAttributes;
}>;
```

Spans are emitted through the `TraceSink` interface, which receives `onSpan` callbacks. The `SinkTracer` in `@riebeckite/core` collects spans and makes them available to the Profiler for report generation.

### Example span JSON

```json
{
  "name": "content.load",
  "startTime": 1700000000000,
  "durationMs": 450,
  "status": "ok",
  "attributes": {
    "source": "content/posts/hello.md",
    "cache": "hit"
  }
}
```
## Related terms

- [[profiler|Profiler]]
- [[logger|Logger]]
- [[build|Build]]

## Learn more

- [Observability](../framework/observability.md)
