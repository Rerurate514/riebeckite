export type ObservabilityValue = string | number | boolean | null;

export type LogContext = Readonly<Record<string, ObservabilityValue>>;
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, cause?: Error): void;
  child(context: LogContext): Logger;
}

export type TraceAttributes = Readonly<Record<string, ObservabilityValue>>;

export type TraceSpan = Readonly<{
  name: string;
  startTime: number;
  durationMs: number;
  status: "ok" | "error";
  attributes: TraceAttributes;
}>;

export type TraceEvent = Readonly<{
  name: string;
  time: number;
  attributes: TraceAttributes;
}>;

export interface TraceSink {
  onSpan(span: TraceSpan): void;
  onEvent(event: TraceEvent): void;
}

export interface Tracer {
  span<T>(
    name: string,
    attributes: TraceAttributes,
    fn: () => T | Promise<T>,
  ): Promise<T>;
  event(name: string, attributes?: TraceAttributes): void;
}

export type Observability = Readonly<{
  logger: Logger;
  tracer: Tracer;
}>;

export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

export class ConsoleLogger implements Logger {
  constructor(private readonly context: LogContext = {}) {}

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: LogContext, cause?: Error): void {
    const details = mergeContext(this.context, context);
    if (cause) {
      console.error(message, details, cause);
      return;
    }
    console.error(message, details);
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(mergeContext(this.context, context));
  }

  private write(
    level: Exclude<LogLevel, "error">,
    message: string,
    context?: LogContext,
  ): void {
    console[level](message, mergeContext(this.context, context));
  }
}

export class NoopTracer implements Tracer {
  async span<T>(
    _name: string,
    _attributes: TraceAttributes,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    return await fn();
  }

  event(): void {}
}

export class SinkTracer implements Tracer {
  constructor(private readonly sink: TraceSink) {}

  async span<T>(
    name: string,
    attributes: TraceAttributes,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    const startTime = wallClockNow();
    const startTick = monotonicNow();
    try {
      const result = await fn();
      this.emitSpan({
        name,
        startTime,
        durationMs: monotonicNow() - startTick,
        status: "ok",
        attributes,
      });
      return result;
    } catch (error) {
      this.emitSpan({
        name,
        startTime,
        durationMs: monotonicNow() - startTick,
        status: "error",
        attributes,
      });
      throw error;
    }
  }

  event(name: string, attributes: TraceAttributes = {}): void {
    try {
      this.sink.onEvent({ name, time: wallClockNow(), attributes });
    } catch {
    }
  }

  private emitSpan(span: TraceSpan): void {
    try {
      this.sink.onSpan(span);
    } catch {
    }
  }
}

export class CompositeTraceSink implements TraceSink {
  constructor(private readonly sinks: readonly TraceSink[]) {}

  onSpan(span: TraceSpan): void {
    for (const sink of this.sinks) {
      try {
        sink.onSpan(span);
      } catch {
      }
    }
  }

  onEvent(event: TraceEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.onEvent(event);
      } catch {
      }
    }
  }
}

export const noopObservability: Observability = {
  logger: new NoopLogger(),
  tracer: new NoopTracer(),
};

function mergeContext(base: LogContext, context?: LogContext): LogContext {
  return context ? { ...base, ...context } : base;
}

function wallClockNow(): number {
  return Date.now();
}

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
