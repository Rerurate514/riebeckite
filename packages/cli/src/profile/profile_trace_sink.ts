import type { TraceEvent, TraceSink, TraceSpan } from "@riebeckite/core";

export type ProfileSpanAggregate = Readonly<{
  calls: number;
  cumulativeDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
  wallDurationMs: number | undefined;
}>;

export type ProfilePlugin = Readonly<{
  name: string;
  duration: ProfileSpanAggregate;
}>;

export type ProfileIncremental = Readonly<{
  added: number;
  changed: number;
  removed: number;
  unchanged: number;
  affected: number;
}>;

export type ProfileCache = Readonly<{
  hits: number;
  misses: number;
  hitRate: number | undefined;
}>;

export type ProfileSlowOperation = Readonly<{
  plugin: string;
  name: string;
  durationMs: number;
  contentPath: string;
}>;

export type ProfileReport = Readonly<{
  totalDurationMs: number | undefined;
  content: ReadonlyMap<string, ProfileSpanAggregate>;
  integrations: ReadonlyMap<string, ProfileSpanAggregate>;
  plugins: readonly ProfilePlugin[];
  incremental: ProfileIncremental | undefined;
  cache: ProfileCache | undefined;
  slowestOperations: readonly ProfileSlowOperation[];
}>;

type MutableDuration = {
  cumulativeDurationMs: number;
  calls: number;
  maxDurationMs: number;
};

export class ProfileTraceSink implements TraceSink {
  private readonly content = new Map<string, MutableDuration>();
  private readonly integrations = new Map<string, MutableDuration>();
  private readonly plugins = new Map<string, MutableDuration>();
  private readonly slowOperations: ProfileSlowOperation[] = [];
  private totalDurationMs: number | undefined;
  private incremental: ProfileIncremental | undefined;
  private cacheHits = 0;
  private cacheMisses = 0;
  private hasCacheEvents = false;

  onSpan(span: TraceSpan): void {
    if (span.name === "build.total") this.totalDurationMs = span.durationMs;
    if (isContentSpan(span.name))
      addDuration(this.content, span.name, span.durationMs);
    if (span.name.startsWith("integration.")) {
      addDuration(this.integrations, span.name, span.durationMs);
    }

    const plugin = stringAttribute(span.attributes, "plugin");
    if (plugin && span.name.startsWith("plugin.")) {
      addDuration(this.plugins, plugin, span.durationMs);
    }
    if (span.name === "plugin.render" && plugin) {
      const contentPath = stringAttribute(span.attributes, "contentPath");
      if (contentPath) {
        addSlowOperation(this.slowOperations, {
          plugin,
          name: span.name,
          durationMs: span.durationMs,
          contentPath,
        });
      }
    }
  }

  onEvent(event: TraceEvent): void {
    if (event.name === "build.incremental") {
      this.incremental = {
        added: numberAttribute(event, "added"),
        changed: numberAttribute(event, "changed"),
        removed: numberAttribute(event, "removed"),
        unchanged: numberAttribute(event, "unchanged"),
        affected: numberAttribute(event, "affected"),
      };
    }
    if (event.name === "cache.hit") {
      this.cacheHits++;
      this.hasCacheEvents = true;
    }
    if (event.name === "cache.miss") {
      this.cacheMisses++;
      this.hasCacheEvents = true;
    }
  }

  createReport(): ProfileReport {
    const cacheRequests = this.cacheHits + this.cacheMisses;
    return {
      totalDurationMs: this.totalDurationMs,
      content: new Map(
        [...this.content.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, duration]) => [name, toAggregate(duration)]),
      ),
      integrations: new Map(
        [...this.integrations.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, duration]) => [name, toAggregate(duration)]),
      ),
      plugins: [...this.plugins.entries()]
        .map(([name, duration]) => ({ name, duration: toAggregate(duration) }))
        .sort(comparePlugins),
      incremental: this.incremental,
      cache: this.hasCacheEvents
        ? {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate:
              cacheRequests === 0 ? undefined : this.cacheHits / cacheRequests,
          }
        : undefined,
      slowestOperations: [...this.slowOperations],
    };
  }
}

function isContentSpan(name: string): boolean {
  return (
    name === "content.scan" ||
    name === "content.process" ||
    name === "content.manifest" ||
    name === "content.graph"
  );
}

function addDuration(
  durations: Map<string, MutableDuration>,
  name: string,
  durationMs: number,
): void {
  const duration = durations.get(name) ?? {
    cumulativeDurationMs: 0,
    calls: 0,
    maxDurationMs: 0,
  };
  duration.cumulativeDurationMs += durationMs;
  duration.calls++;
  duration.maxDurationMs = Math.max(duration.maxDurationMs, durationMs);
  durations.set(name, duration);
}

function toAggregate(duration: MutableDuration): ProfileSpanAggregate {
  return {
    calls: duration.calls,
    cumulativeDurationMs: duration.cumulativeDurationMs,
    averageDurationMs: duration.cumulativeDurationMs / duration.calls,
    maxDurationMs: duration.maxDurationMs,
    wallDurationMs:
      duration.calls === 1 ? duration.cumulativeDurationMs : undefined,
  };
}

function stringAttribute(
  attributes: TraceSpan["attributes"],
  key: string,
): string | undefined {
  const value = attributes[key];
  return typeof value === "string" ? value : undefined;
}

function numberAttribute(event: TraceEvent, key: string): number {
  const value = event.attributes[key];
  return typeof value === "number" ? value : 0;
}

function comparePlugins(left: ProfilePlugin, right: ProfilePlugin): number {
  return (
    right.duration.cumulativeDurationMs - left.duration.cumulativeDurationMs ||
    left.name.localeCompare(right.name)
  );
}

function compareSlowOperations(
  left: ProfileSlowOperation,
  right: ProfileSlowOperation,
): number {
  return (
    right.durationMs - left.durationMs ||
    left.plugin.localeCompare(right.plugin) ||
    left.contentPath.localeCompare(right.contentPath)
  );
}

function addSlowOperation(
  operations: ProfileSlowOperation[],
  operation: ProfileSlowOperation,
): void {
  operations.push(operation);
  operations.sort(compareSlowOperations);
  operations.splice(5);
}
