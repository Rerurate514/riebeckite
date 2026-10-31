import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import {
  applyManifestHookSnapshot,
  captureManifestHookRestorePoint,
  createManifestHookCacheEntry,
  fingerprintManifestHookInput,
  fingerprintManifestHookSideEffects,
  fingerprintManifestHookSnapshot,
  type ManifestHookRestorePoint,
  restoreManifestHookEntries,
  serializeManifestEntries,
} from "../content/manifest_hook_cache.js";
import type { ContentManifest } from "../types/content_manifest.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import { runPluginHook } from "./plugin_lifecycle.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";

export type ManifestHookMetrics = Readonly<{
  manifestHooksExecuted: number;
  manifestHooksReused: number;
  manifestHookCacheHit: number;
  manifestHookCacheMiss: number;
  manifestHookDurationMs: number;
  byPlugin: Readonly<Record<string, ManifestHookPluginMetrics>>;
}>;

export type ManifestHookPluginMetrics = Readonly<{
  executed: number;
  reused: number;
  cacheHit: number;
  cacheMiss: number;
  durationMs: number;
  reason: string;
}>;

type ManifestHookRunnerOptions = {
  readonly plugins: () => readonly RiebeckitePlugin[];
  readonly createContext: (
    contentIndex: Map<string, string>,
  ) => PluginContextBase;
  readonly createPluginContext: <TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ) => PluginContextWithCache<TContext>;
  readonly generatedOutputCount: () => number;
  readonly diagnosticCount: () => number;
  readonly recordExecution: (
    plugin: RiebeckitePlugin,
    hook: string,
    status: "executed" | "failed" | "reused",
    durationMs: number,
  ) => void;
};

export class ManifestHookRunner {
  private manifestHooksExecuted = 0;
  private manifestHookDurationMs = 0;
  private manifestHooksReused = 0;
  private manifestHookCache: ManifestHookCacheEntry[] = [];
  private manifestHookMetricsByPlugin = new Map<
    string,
    ManifestHookPluginMetrics
  >();

  constructor(private readonly options: ManifestHookRunnerOptions) {}

  getMetrics(): ManifestHookMetrics {
    return {
      manifestHooksExecuted: this.manifestHooksExecuted,
      manifestHooksReused: this.manifestHooksReused,
      manifestHookCacheHit: this.manifestHooksReused,
      manifestHookCacheMiss: this.manifestHooksExecuted,
      manifestHookDurationMs: this.manifestHookDurationMs,
      byPlugin: Object.fromEntries(this.manifestHookMetricsByPlugin),
    };
  }

  getNoChangeFastPathBlockReason(
    previousCache: readonly ManifestHookCacheEntry[],
    pipelineFingerprint: string | undefined,
  ): string | undefined {
    const plugins = this.options.plugins();
    if (plugins.some((plugin) => plugin.buildEnd)) return "plugin-build-end";

    let cacheIndex = 0;
    for (const plugin of plugins) {
      if (!plugin.onManifestCreated) continue;
      if (!plugin.manifestHookCache) return "manifest-hook-cache-disabled";

      const cached = previousCache[cacheIndex];
      cacheIndex += 1;
      if (
        cached?.pluginName !== plugin.name ||
        cached.cacheVersion !== plugin.manifestHookCache.version ||
        !cached.cacheable ||
        cached.pipelineFingerprint !== pipelineFingerprint
      )
        return "manifest-hook-cache-miss";
    }
    return undefined;
  }

  getCache(): readonly ManifestHookCacheEntry[] {
    return this.manifestHookCache;
  }

  async runManifestCreated(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
    previousCache: readonly ManifestHookCacheEntry[] = [],
    pipelineFingerprint: string | undefined,
  ) {
    const context = {
      ...this.options.createContext(contentIndex),
      manifest,
    };
    let cacheIndex = 0;
    for (const plugin of this.options.plugins()) {
      const hook = plugin.onManifestCreated;
      if (!hook) continue;
      const cacheVersion = plugin.manifestHookCache?.version;
      if (!cacheVersion) {
        await this.runManifestHook(plugin, hook, context, "cache-disabled");
        continue;
      }
      const inputFingerprint = fingerprintManifestHookInput(manifest);
      const cached = previousCache[cacheIndex];
      cacheIndex += 1;
      const reason = manifestHookCacheMissReason(
        cached,
        plugin.name,
        pipelineFingerprint,
        inputFingerprint,
      );
      let restored = false;
      let restorePoint: ManifestHookRestorePoint | undefined;
      if (
        cached !== undefined &&
        cached.pluginName === plugin.name &&
        cached.cacheVersion === cacheVersion &&
        cached.cacheable &&
        cached.pipelineFingerprint === pipelineFingerprint &&
        cached.inputFingerprint === inputFingerprint &&
        cached.snapshot !== undefined &&
        cached.outputFingerprint !== undefined
      ) {
        restorePoint = captureManifestHookRestorePoint(manifest);
        restored = applyManifestHookSnapshot(manifest, cached.snapshot);
        if (
          restored &&
          fingerprintManifestHookSnapshot(manifest) === cached.outputFingerprint
        ) {
          this.manifestHooksReused += 1;
          this.manifestHookCache.push(cached);
          this.recordManifestHookMetric(plugin.name, "reused", "cache-hit", 0);
          this.options.recordExecution(
            plugin,
            "onManifestCreated",
            "reused",
            0,
          );
          continue;
        }
      }
      if (restorePoint) restoreManifestHookEntries(manifest, restorePoint);
      const entriesBeforeHook = serializeManifestEntries(manifest.entries);
      const sideEffectsBefore = fingerprintManifestHookSideEffects(manifest);
      const outputCountBefore = this.options.generatedOutputCount();
      const diagnosticCountBefore = this.options.diagnosticCount();
      const manifestDiagnosticCountBefore = manifest.diagnostics.length;
      await this.runManifestHook(plugin, hook, context, reason);
      const entriesAfterHook = serializeManifestEntries(manifest.entries);
      this.manifestHookCache.push(
        createManifestHookCacheEntry(
          plugin.name,
          cacheVersion,
          plugin.resolveExternalDependencies === undefined &&
            sideEffectsBefore ===
              fingerprintManifestHookSideEffects(manifest) &&
            outputCountBefore === this.options.generatedOutputCount() &&
            diagnosticCountBefore === this.options.diagnosticCount() &&
            manifestDiagnosticCountBefore === manifest.diagnostics.length,
          pipelineFingerprint,
          inputFingerprint,
          manifest,
          entriesBeforeHook,
          entriesAfterHook,
        ),
      );
    }
  }

  private async runManifestHook(
    plugin: RiebeckitePlugin,
    hook: NonNullable<RiebeckitePlugin["onManifestCreated"]>,
    context: PluginContextBase & { manifest: ContentManifest },
    reason: string,
  ): Promise<void> {
    const started = performance.now();
    this.manifestHooksExecuted += 1;
    try {
      await runPluginHook(
        plugin,
        "onManifestCreated",
        this.options.createPluginContext(plugin, context),
        hook,
      );
    } catch (error) {
      this.options.recordExecution(
        plugin,
        "onManifestCreated",
        "failed",
        performance.now() - started,
      );
      throw error;
    } finally {
      const durationMs = performance.now() - started;
      this.manifestHookDurationMs += durationMs;
      this.recordManifestHookMetric(
        plugin.name,
        "executed",
        reason,
        durationMs,
      );
    }
    this.options.recordExecution(
      plugin,
      "onManifestCreated",
      "executed",
      performance.now() - started,
    );
  }

  private recordManifestHookMetric(
    pluginName: string,
    outcome: "executed" | "reused",
    reason: string,
    durationMs: number,
  ): void {
    const previous = this.manifestHookMetricsByPlugin.get(pluginName) ?? {
      executed: 0,
      reused: 0,
      cacheHit: 0,
      cacheMiss: 0,
      durationMs: 0,
      reason,
    };
    this.manifestHookMetricsByPlugin.set(pluginName, {
      executed: previous.executed + (outcome === "executed" ? 1 : 0),
      reused: previous.reused + (outcome === "reused" ? 1 : 0),
      cacheHit: previous.cacheHit + (outcome === "reused" ? 1 : 0),
      cacheMiss: previous.cacheMiss + (outcome === "executed" ? 1 : 0),
      durationMs: previous.durationMs + durationMs,
      reason,
    });
  }
}

function manifestHookCacheMissReason(
  cached: ManifestHookCacheEntry | undefined,
  pluginName: string,
  pipelineFingerprint: string | undefined,
  inputFingerprint: string,
): string {
  if (!cached) return "cache-missing";
  if (cached.pluginName !== pluginName) return "plugin-order-changed";
  if (!cached.cacheable) return "uncacheable";
  if (cached.pipelineFingerprint !== pipelineFingerprint)
    return "pipeline-fingerprint-changed";
  if (cached.inputFingerprint !== inputFingerprint)
    return "manifest-input-changed";
  return "snapshot-invalid";
}
