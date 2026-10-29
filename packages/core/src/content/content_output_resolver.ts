import type { Observability } from "../observability.js";
import type { PluginRuntime } from "../plugin/plugin_runtime.js";
import type { ContentManifest } from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { ContentBuildState } from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";
import {
  determineOutputChanges,
  type OutputChangeSet,
} from "./output_dependency.js";

export class ContentOutputResolver {
  constructor(
    private readonly pluginRuntime: PluginRuntime,
    private readonly observability: Observability,
  ) {}

  async populatePageRoutes(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<void> {
    manifest.pageRoutes = [
      ...(await this.pluginRuntime.getPageRoutes(manifest, contentIndex)),
    ];
  }

  async resolve(input: {
    readonly manifest: ContentManifest;
    readonly contentIndex: Map<string, string>;
    readonly previousState: ContentBuildState | undefined;
    readonly changeSet: ContentChangeSet;
    readonly affectedContent: {
      readonly direct: ReadonlySet<string>;
      readonly dependent: ReadonlySet<string>;
    };
    readonly externalDependencies: readonly ExternalDependencySnapshot[];
    readonly externalDependencyFailures: readonly ExternalDependencyFailure[];
    readonly contentFingerprints?: ReadonlyMap<string, string | undefined>;
  }): Promise<OutputChangeSet> {
    const pluginPageOutputs = await this.observability.tracer.span(
      "output.dependencies.plugin",
      {},
      () =>
        this.pluginRuntime.getPageOutputs(input.manifest, input.contentIndex),
    );
    return await this.observability.tracer.span(
      "output.dependencies.resolve",
      {},
      () =>
        determineOutputChanges({
          manifest: input.manifest,
          previousState: input.previousState,
          changeSet: input.changeSet,
          affectedContent: input.affectedContent,
          pluginPageOutputs,
          contentOutputDependencies:
            this.pluginRuntime.getContentOutputDependencies(),
          externalDependencies: input.externalDependencies,
          externalDependencyFailures: input.externalDependencyFailures,
          contentFingerprints: input.contentFingerprints,
        }),
    );
  }
}
