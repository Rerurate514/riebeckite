import type {
  CompletedContentBuildSnapshot,
  TraceEvent,
  TraceSpan,
} from "@riebeckite/core";

const maximumLimit = 100;
const defaultLimit = 100;

export type PluginExecutionQuery = {
  readonly query: string;
  readonly plugin: string | undefined;
  readonly sort: "duration" | "name";
  readonly page: number;
  readonly limit: number;
};

export type PluginHookExecution = {
  readonly plugin: string;
  readonly hook: string;
  readonly count: number;
  readonly durationMs: number;
  readonly maximumDurationMs: number;
  readonly status: "ok" | "error";
  readonly firstStartTime: number;
};

export type PluginExecution = {
  readonly plugins: readonly {
    readonly name: string;
    readonly order: number;
    readonly enabled: boolean;
    readonly provides: readonly string[];
    readonly requires: readonly string[];
    readonly optional: readonly string[];
    readonly hookCount: number;
    readonly cumulativeDurationMs: number;
    readonly failedHookCount: number;
    readonly diagnostics: number;
    readonly cache: {
      readonly hit: number;
      readonly miss: number;
      readonly bypass: number;
      readonly status: "observed" | "not-observed";
    };
  }[];
  readonly hooks: readonly PluginHookExecution[];
  readonly hiddenHookCount: number;
  readonly page: number;
  readonly trace:
    | {
        readonly status: "available";
        readonly spanCount: number;
        readonly eventCount: number;
        readonly wallClockMs: number | null;
        readonly windowMs: number | null;
      }
    | { readonly status: "unavailable"; readonly reason: string };
};

export type PluginExecutionResult =
  | ({ readonly status: "available" } & PluginExecution)
  | { readonly status: "unavailable"; readonly reason: string };

export function pluginExecutionQueryFromRequest(
  url: string | undefined,
): PluginExecutionQuery {
  const parameters = new URL(
    url ?? "/__riebeckite/inspector/plugins",
    "http://localhost",
  ).searchParams;
  return {
    query: parameters.get("q") ?? "",
    plugin: parameters.get("plugin") ?? undefined,
    sort: parameters.get("sort") === "name" ? "name" : "duration",
    page: nonNegativeInteger(parameters.get("page"), 0),
    limit: Math.min(
      maximumLimit,
      Math.max(1, nonNegativeInteger(parameters.get("limit"), defaultLimit)),
    ),
  };
}

export function inspectPluginExecution(
  snapshot: CompletedContentBuildSnapshot | undefined,
  query: PluginExecutionQuery,
): PluginExecutionResult {
  if (!snapshot) {
    return {
      status: "unavailable",
      reason: "no completed development build is available for this revision",
    };
  }
  const trace = snapshot.trace;
  const spans = trace?.spans.filter(isPluginSpan) ?? [];
  const events = trace?.events ?? [];
  const hooks = aggregateHooks(spans);
  const diagnostics = snapshot.manifest.diagnostics;
  const plugins = snapshot.plugins.map((plugin, index) => {
    const pluginHooks = hooks.filter((hook) => hook.plugin === plugin.name);
    const cacheEvents = events.filter(
      (event) =>
        event.attributes.plugin === plugin.name &&
        (event.name === "cache.hit" ||
          event.name === "cache.miss" ||
          event.name === "cache.bypass"),
    );
    const hit = countEvents(cacheEvents, "cache.hit");
    const miss = countEvents(cacheEvents, "cache.miss");
    const bypass = countEvents(cacheEvents, "cache.bypass");
    return {
      name: plugin.name,
      order: index + 1,
      enabled: plugin.enabled,
      provides: plugin.provides,
      requires: plugin.requires,
      optional: plugin.optional,
      hookCount: pluginHooks.reduce((total, hook) => total + hook.count, 0),
      cumulativeDurationMs: pluginHooks.reduce(
        (total, hook) => total + hook.durationMs,
        0,
      ),
      failedHookCount: pluginHooks.filter((hook) => hook.status === "error")
        .length,
      diagnostics: diagnostics.filter(
        (diagnostic) => diagnostic.pluginName === plugin.name,
      ).length,
      cache: {
        hit,
        miss,
        bypass,
        status:
          hit + miss + bypass > 0
            ? ("observed" as const)
            : ("not-observed" as const),
      },
    };
  });
  const filtered = hooks
    .filter(
      (hook) =>
        (!query.plugin || hook.plugin === query.plugin) &&
        (!query.query ||
          `${hook.plugin} ${hook.hook}`
            .toLowerCase()
            .includes(query.query.toLowerCase())),
    )
    .sort((left, right) =>
      query.sort === "name"
        ? left.plugin.localeCompare(right.plugin) ||
          left.hook.localeCompare(right.hook)
        : right.durationMs - left.durationMs ||
          left.plugin.localeCompare(right.plugin),
    );
  const start = query.page * query.limit;
  return {
    status: "available",
    plugins,
    hooks: filtered.slice(start, start + query.limit),
    hiddenHookCount: Math.max(0, filtered.length - start - query.limit),
    page: query.page,
    trace: trace
      ? {
          status: "available",
          spanCount: trace.spans.length,
          eventCount: trace.events.length,
          wallClockMs: snapshot.completedAt - snapshot.startedAt,
          windowMs: traceWindow(trace.spans),
        }
      : {
          status: "unavailable",
          reason: "this development build was created without a trace recorder",
        },
  };
}

function isPluginSpan(span: TraceSpan): boolean {
  return (
    typeof span.attributes.plugin === "string" &&
    (span.name.startsWith("plugin.") || span.attributes.hook !== undefined)
  );
}

function aggregateHooks(
  spans: readonly TraceSpan[],
): readonly PluginHookExecution[] {
  const hooks = new Map<string, PluginHookExecution>();
  for (const span of spans) {
    const plugin = String(span.attributes.plugin);
    const hook =
      typeof span.attributes.hook === "string"
        ? span.attributes.hook
        : span.name.replace(/^plugin\./, "");
    const key = `${plugin}\0${hook}`;
    const existing = hooks.get(key);
    if (!existing) {
      hooks.set(key, {
        plugin,
        hook,
        count: 1,
        durationMs: span.durationMs,
        maximumDurationMs: span.durationMs,
        status: span.status,
        firstStartTime: span.startTime,
      });
      continue;
    }
    hooks.set(key, {
      ...existing,
      count: existing.count + 1,
      durationMs: existing.durationMs + span.durationMs,
      maximumDurationMs: Math.max(existing.maximumDurationMs, span.durationMs),
      status:
        existing.status === "error" || span.status === "error" ? "error" : "ok",
      firstStartTime: Math.min(existing.firstStartTime, span.startTime),
    });
  }
  return [...hooks.values()];
}

function traceWindow(spans: readonly TraceSpan[]): number | null {
  if (spans.length === 0) return null;
  let start = Number.POSITIVE_INFINITY;
  let end = 0;
  for (const span of spans) {
    start = Math.min(start, span.startTime);
    end = Math.max(end, span.startTime + span.durationMs);
  }
  return end - start;
}

function countEvents(events: readonly TraceEvent[], name: string): number {
  return events.filter((event) => event.name === name).length;
}

function nonNegativeInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
