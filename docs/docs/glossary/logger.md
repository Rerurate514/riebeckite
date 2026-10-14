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

## Logger Details

The `Logger` interface provides structured logging methods across the build:

```ts
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, cause?: Error): void;
  child(context: LogContext): Logger;
}
```

The `ConsoleLogger` implementation writes to `console` at the appropriate level. Log messages include a `LogContext` key-value map for structured correlation. Each logger can produce child loggers with additional context via the `child` method.

### Example

```ts
import { ConsoleLogger } from "@riebeckite/core";

const logger = new ConsoleLogger({ phase: "build" });
logger.info("Build started");
logger.child({ step: "content" }).info("Processing content");
// Output includes structured context for correlation
```
## Related terms

- [[trace-span|Trace Span]]
- [[profiler|Profiler]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more

- [Observability](../framework/observability.md)
