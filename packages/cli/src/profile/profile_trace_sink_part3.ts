import type { TraceEvent, TraceSpan } from "@riebeckite/core";
import type {
  MutableDuration,
  ProfileCacheReasonCount,
  ProfilePlugin,
  ProfileSlowOperation,
  ProfileSpanAggregate,
} from "./profile_trace_sink_part1.js";

export function isContentSpan(name: string): boolean {
  return (
    name === "content.build" ||
    name === "content.scan" ||
    name === "content.process" ||
    name.startsWith("content.process.") ||
    name === "content.markdown" ||
    name === "content.manifest" ||
    name === "content.graph"
  );
}

export function addDuration(
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

export function toAggregate(duration: MutableDuration): ProfileSpanAggregate {
  return {
    calls: duration.calls,
    cumulativeDurationMs: duration.cumulativeDurationMs,
    averageDurationMs: duration.cumulativeDurationMs / duration.calls,
    maxDurationMs: duration.maxDurationMs,
    wallDurationMs:
      duration.calls === 1 ? duration.cumulativeDurationMs : undefined,
  };
}

export function stringAttribute(
  attributes: TraceSpan["attributes"],
  key: string,
): string | undefined {
  const value = attributes[key];
  return typeof value === "string" ? value : undefined;
}

export function numberAttribute(event: TraceEvent, key: string): number {
  const value = event.attributes[key];
  return typeof value === "number" ? value : 0;
}

export function booleanAttribute(event: TraceEvent, key: string): boolean {
  const value = event.attributes[key];
  return typeof value === "boolean" ? value : false;
}

export function incrementReason(
  counts: Map<string, number>,
  reason: string | undefined,
): void {
  const key = reason ?? "unspecified";
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function sortReasonCounts(
  counts: ReadonlyMap<string, number>,
): ProfileCacheReasonCount[] {
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.reason.localeCompare(right.reason),
    );
}

export function comparePlugins(
  left: ProfilePlugin,
  right: ProfilePlugin,
): number {
  return (
    right.duration.cumulativeDurationMs - left.duration.cumulativeDurationMs ||
    left.name.localeCompare(right.name)
  );
}

export function compareSlowOperations(
  left: ProfileSlowOperation,
  right: ProfileSlowOperation,
): number {
  return (
    right.durationMs - left.durationMs ||
    left.plugin.localeCompare(right.plugin) ||
    left.contentPath.localeCompare(right.contentPath)
  );
}

export function addSlowOperation(
  operations: ProfileSlowOperation[],
  operation: ProfileSlowOperation,
): void {
  operations.push(operation);
  operations.sort(compareSlowOperations);
  operations.splice(5);
}
