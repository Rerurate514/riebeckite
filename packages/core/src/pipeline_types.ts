import type { CachedContentDependency } from "./content/content_dependency_tracker.js";
import type { ContentSource } from "./content/content_source.js";
import type { Observability } from "./observability.js";
import type { RiebeckitePlugin } from "./types/plugin.js";

export interface PipelineOptions {
  plugins?: RiebeckitePlugin[];
  isDevelopment?: boolean;
  observability?: Observability;
  traceRecorder?: import("./observability.js").BuildTraceRecorder;
  config?: import("./types/resolved_riebeckite_config.js").ResolvedRiebeckiteConfig;
  contentSource?: ContentSource;
  isRoutable?: (slug: string) => boolean;
  onContentDependencies?(
    slug: string,
    dependencies: readonly CachedContentDependency[],
  ): void;
  onPersistentContentCacheResult?(result: "hit" | "miss" | "bypass"): void;
  contentScopeFingerprint?: string;
}
