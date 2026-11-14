import type { PipelineOptions } from "../pipeline.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import { asContentManagerContext } from "./content_manager_context.js";
import { ContentManagerMethodsB } from "./content_manager_methods_b.js";
import { initializeContentManager } from "./content_manager_state.js";
import type { ContentSource } from "./content_source.js";

export class ContentManager extends ContentManagerMethodsB {
  constructor(
    content: ContentSource,
    _exclude: string[] = [],
    pipelineOptions: PipelineOptions = {},
  ) {
    super();
    initializeContentManager(
      asContentManagerContext(this),
      content,
      _exclude,
      pipelineOptions,
    );
  }
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
    publishingBuildTime?: Date | string;
    commitBuildState?: boolean;
  }
}

export type {
  CompletedContentBuildSnapshot,
  ContentBuildOptions,
  ContentInspection,
  PublicAssetReferences,
} from "./content_manager_shared.js";
