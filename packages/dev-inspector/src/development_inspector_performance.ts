import type { CompletedContentBuildSnapshot } from "@riebeckite/core";

export type BuildPerformance = {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  manifestHookDurationMs: number;
  manifestHooksExecuted: number;
  manifestHooksReused: number;
  manifestHookCacheHit: number;
  manifestHookCacheMiss: number;
  slowestPlugins: {
    name: string;
    durationMs: number;
    executed: number;
    reused: number;
  }[];
};

export function inspectBuildPerformance(
  snapshot: CompletedContentBuildSnapshot,
): BuildPerformance {
  const metrics = snapshot.manifestHookMetrics;
  const slowestPlugins = Object.entries(metrics.byPlugin)
    .filter(([, plugin]) => plugin.durationMs > 0)
    .sort((left, right) => right[1].durationMs - left[1].durationMs)
    .slice(0, 5)
    .map(([name, plugin]) => ({
      name,
      durationMs: plugin.durationMs,
      executed: plugin.executed,
      reused: plugin.reused,
    }));

  return {
    startedAt: new Date(snapshot.startedAt).toISOString(),
    completedAt: new Date(snapshot.completedAt).toISOString(),
    durationMs: snapshot.completedAt - snapshot.startedAt,
    manifestHookDurationMs: metrics.manifestHookDurationMs,
    manifestHooksExecuted: metrics.manifestHooksExecuted,
    manifestHooksReused: metrics.manifestHooksReused,
    manifestHookCacheHit: metrics.manifestHookCacheHit,
    manifestHookCacheMiss: metrics.manifestHookCacheMiss,
    slowestPlugins,
  };
}
