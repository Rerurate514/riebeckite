import type { TraceEvent, TraceSink, TraceSpan } from "@riebeckite/core";
import type {
  DiagnosticCounts,
  MutableDuration,
  ProfileFastPath,
  ProfileIncremental,
  ProfileReport,
  ProfileSlowOperation,
} from "./profile_trace_sink_part1.js";
import {
  addDuration,
  addSlowOperation,
  booleanAttribute,
  comparePlugins,
  incrementReason,
  isContentSpan,
  numberAttribute,
  sortReasonCounts,
  stringAttribute,
  toAggregate,
} from "./profile_trace_sink_part3.js";

export class ProfileTraceSink implements TraceSink {
  private readonly stages = new Map<string, MutableDuration>();
  private readonly content = new Map<string, MutableDuration>();
  private readonly integrations = new Map<string, MutableDuration>();
  private readonly plugins = new Map<string, MutableDuration>();
  private readonly diagnosticsDuration = new Map<string, MutableDuration>();
  private readonly slowOperations: ProfileSlowOperation[] = [];
  private totalDurationMs: number | undefined;
  private incremental: ProfileIncremental | undefined;
  private diagnosticCounts: DiagnosticCounts | undefined;
  private cacheHits = 0;
  private cacheMisses = 0;
  private hasCacheEvents = false;
  private contentCacheHits = 0;
  private contentCacheMisses = 0;
  private contentCacheBypasses = 0;
  private hasContentCacheEvents = false;
  private readonly contentCacheMissReasons = new Map<string, number>();
  private readonly contentCacheBypassReasons = new Map<string, number>();
  private fastPath: ProfileFastPath | undefined;

  onSpan(span: TraceSpan): void {
    if (span.name === "build.total") this.totalDurationMs = span.durationMs;
    addDuration(this.stages, span.name, span.durationMs);
    if (isContentSpan(span.name))
      addDuration(this.content, span.name, span.durationMs);
    if (span.name.startsWith("integration.")) {
      addDuration(this.integrations, span.name, span.durationMs);
    }
    if (span.name === "diagnostics.run") {
      addDuration(this.diagnosticsDuration, span.name, span.durationMs);
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
    if (event.name === "integration.timing") {
      const name = stringAttribute(event.attributes, "name");
      const durationMs = numberAttribute(event, "durationMs");
      if (name && durationMs >= 0)
        addDuration(this.integrations, name, durationMs);
    }
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
    if (event.name === "persistentContentCache.hit") {
      this.contentCacheHits++;
      this.hasContentCacheEvents = true;
    }
    if (event.name === "persistentContentCache.miss") {
      this.contentCacheMisses++;
      this.hasContentCacheEvents = true;
      incrementReason(
        this.contentCacheMissReasons,
        stringAttribute(event.attributes, "reason"),
      );
    }
    if (event.name === "persistentContentCache.bypass") {
      this.contentCacheBypasses++;
      this.hasContentCacheEvents = true;
      incrementReason(
        this.contentCacheBypassReasons,
        stringAttribute(event.attributes, "reason"),
      );
    }
    if (event.name === "diagnostics.summary") {
      this.diagnosticCounts = {
        total: numberAttribute(event, "total"),
        errors: numberAttribute(event, "errors"),
        warnings: numberAttribute(event, "warnings"),
        info: numberAttribute(event, "info"),
      };
    }
    if (event.name === "build.fast-path") {
      this.fastPath = {
        used: booleanAttribute(event, "fastPathUsed"),
        blockReason:
          stringAttribute(event.attributes, "fastPathBlockReason") ?? "",
        fastPathDecisionDurationMs: numberAttribute(
          event,
          "fastPathDecisionDurationMs",
        ),
        buildStateReadDurationMs: numberAttribute(
          event,
          "buildStateReadDurationMs",
        ),
        contentPlanDurationMs: numberAttribute(event, "contentPlanDurationMs"),
        externalDependencyDurationMs: numberAttribute(
          event,
          "externalDependencyDurationMs",
        ),
        pluginValidationDurationMs: numberAttribute(
          event,
          "pluginValidationDurationMs",
        ),
        outputInventoryValidationDurationMs: numberAttribute(
          event,
          "outputInventoryValidationDurationMs",
        ),
        outputHashValidationDurationMs: numberAttribute(
          event,
          "outputHashValidationDurationMs",
        ),
        outputFilesHashed: numberAttribute(event, "outputFilesHashed"),
        outputBytesHashed: numberAttribute(event, "outputBytesHashed"),
        rssBeforeBytes: numberAttribute(event, "rssBeforeBytes"),
        rssAfterBytes: numberAttribute(event, "rssAfterBytes"),
        peakRssBytes: numberAttribute(event, "peakRssBytes"),
      };
    }
  }

  createReport(): ProfileReport {
    const cacheRequests = this.cacheHits + this.cacheMisses;
    const contentCacheRequests =
      this.contentCacheHits + this.contentCacheMisses;
    const diagnosticsDuration = this.diagnosticsDuration.get("diagnostics.run");
    const diagnostics =
      diagnosticsDuration || this.diagnosticCounts
        ? {
            calls: diagnosticsDuration?.calls ?? 0,
            durationMs: diagnosticsDuration?.cumulativeDurationMs ?? 0,
            total: this.diagnosticCounts?.total ?? 0,
            errors: this.diagnosticCounts?.errors ?? 0,
            warnings: this.diagnosticCounts?.warnings ?? 0,
            info: this.diagnosticCounts?.info ?? 0,
          }
        : undefined;
    return {
      totalDurationMs: this.totalDurationMs,
      stages: new Map(
        [...this.stages.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, duration]) => [name, toAggregate(duration)]),
      ),
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
      contentCache: this.hasContentCacheEvents
        ? {
            hits: this.contentCacheHits,
            misses: this.contentCacheMisses,
            bypasses: this.contentCacheBypasses,
            hitRate:
              contentCacheRequests === 0
                ? undefined
                : this.contentCacheHits / contentCacheRequests,
            missReasons: sortReasonCounts(this.contentCacheMissReasons),
            bypassReasons: sortReasonCounts(this.contentCacheBypassReasons),
          }
        : undefined,
      diagnostics,
      fastPath: this.fastPath,
      slowestOperations: [...this.slowOperations],
    };
  }
}
