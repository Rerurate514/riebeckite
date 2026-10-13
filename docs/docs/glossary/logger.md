---
title: Logger
sidebar:
  hidden: true
---

# Logger

The observability channel used across the build to emit structured events and spans. Its output is consumed by the CLI, the profiler, and the integration.

## Role

Emits structured build events.
Feeds the CLI, profiler, and integration.

## Signals

Structured, safe operational messages.
Not a flood of messages to find performance causes — use the profiler for that.

## Related terms

- [[trace-span|Trace Span]]
- [[profiler|Profiler]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more

- [Observability](../framework/observability.md)
