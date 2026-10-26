import type { Observability } from "../observability.js";
import type { PluginRuntime } from "../plugin/plugin_runtime.js";
import type { ContentPublicLocation } from "../types/content_manifest.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import type { ContentBuildCoordinator } from "./content_build_coordinator.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type { ContentBuildOptions } from "./content_manager.js";
import { hasGlobalContentDependency } from "./content_persistent_cache.js";

type ContentBuildSessionDependencies = {
  readonly config: () => ResolvedRiebeckiteConfig | undefined;
  readonly enableBuildTime: () => void;
  readonly getContentIndex: () => Promise<Map<string, string>>;
  readonly getContentLocations: () => Promise<
    ReadonlyMap<string, ContentPublicLocation>
  >;
  readonly computePipelineFingerprint: (
    locations?: ReadonlyMap<string, ContentPublicLocation>,
  ) => string;
  readonly getPipelineFingerprint: () => string | undefined;
  readonly requiresFullContentRegeneration: () => boolean;
  readonly pluginRuntime: PluginRuntime;
  readonly buildCoordinator: ContentBuildCoordinator;
  readonly observability: Observability;
  readonly publishingBuildTime: Date;
};

export class ContentBuildSession {
  private plan: Promise<ContentBuildPlan> | null = null;

  constructor(private readonly dependencies: ContentBuildSessionDependencies) {}

  getPlan(options?: ContentBuildOptions): Promise<ContentBuildPlan> {
    if (this.plan) return this.plan;

    const plan = this.createPlan(options);
    this.plan = plan;
    void plan.catch(() => {
      if (this.plan === plan) this.plan = null;
    });
    return plan;
  }

  private async createPlan(
    options?: ContentBuildOptions,
  ): Promise<ContentBuildPlan> {
    const dependencies = this.dependencies;
    dependencies.enableBuildTime();
    const config = dependencies.config();
    if (config && hasGlobalContentDependency(config)) {
      dependencies.computePipelineFingerprint(
        await dependencies.getContentLocations(),
      );
    }
    const contentIndex = await dependencies.getContentIndex();
    const external = await dependencies.observability.tracer.span(
      "external.dependencies.resolve",
      {},
      () =>
        dependencies.pluginRuntime.resolveExternalDependencies(contentIndex),
    );
    return dependencies.buildCoordinator.getPlan(
      options?.incremental !== false,
      dependencies.getPipelineFingerprint(),
      dependencies.requiresFullContentRegeneration(),
      external.snapshots,
      external.failures,
      dependencies.publishingBuildTime,
    );
  }
}
