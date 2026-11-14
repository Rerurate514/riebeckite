import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { TraceSnapshot } from "../observability.js";
import type {
  DerivedViewInspection,
  ManifestHookMetrics,
} from "../plugin/plugin_runtime.js";
import type { BuildProvenance } from "../provenance/provenance.js";
import type { ContentManifest } from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { ResolvedPluginMetadata } from "../types/plugin.js";
import type { InspectorTabSnapshot } from "../types/plugin_inspector.js";
import type { PostFrontmatter } from "../types/post_content.js";
import type { FullRegenerationReason } from "./content_build_plan.js";
import type { ContentSourceEntry } from "./content_source.js";
import type { OutputChangeSet } from "./output_dependency.js";

export type Backlink = {
  slug: string;
};

export type ContentPostReference = {
  slug: string;
};

export type ContentBuildOptions = {
  incremental?: boolean;
};

export type PublicAssetReferences = {
  readonly images: ReadonlySet<string>;
  readonly attachments: ReadonlySet<string>;
  readonly nextPublishAt: number | null;
};

export type ContentInspection = {
  readonly entries: readonly ContentSourceEntry[];
  readonly contentIndex: ReadonlyMap<string, string>;
  readonly diagnostics: readonly Diagnostic[];
};

export type CompletedContentBuildSnapshot = {
  readonly manifest: ContentManifest;
  readonly outputChangeSet: OutputChangeSet;
  readonly fullRegenerationReasons: readonly FullRegenerationReason[];
  readonly completedAt: number;
  readonly startedAt: number;
  readonly plugins: readonly ResolvedPluginMetadata[];
  readonly manifestHookMetrics: ManifestHookMetrics;
  readonly derivedViews: readonly DerivedViewInspection[];
  readonly inspectorTabs: readonly InspectorTabSnapshot[];
  readonly finalHtmlDiagnostics: readonly Diagnostic[];
  readonly provenance?: BuildProvenance;
  readonly trace?: TraceSnapshot;
};

export const CONTENT_PROCESSING_CONCURRENCY = 16;

export function freezeManifestHookMetrics(
  metrics: ManifestHookMetrics,
): ManifestHookMetrics {
  return Object.freeze({
    ...metrics,
    byPlugin: Object.freeze(
      Object.fromEntries(
        Object.entries(metrics.byPlugin).map(([name, plugin]) => [
          name,
          Object.freeze({ ...plugin }),
        ]),
      ),
    ),
  });
}

export function freezeOutputChangeSet(
  changes: OutputChangeSet,
): OutputChangeSet {
  const freezeOutput = (output: OutputChangeSet["affected"][number]) =>
    Object.freeze({
      ...output,
      dependencies: Object.freeze([...output.dependencies]),
    });
  return Object.freeze({
    ...changes,
    affected: Object.freeze(changes.affected.map(freezeOutput)),
    unchanged: Object.freeze(changes.unchanged.map(freezeOutput)),
    removed: Object.freeze(changes.removed.map(freezeOutput)),
    reasons: new Map(changes.reasons),
  });
}

export function readFrontmatter(markdown: string): PostFrontmatter {
  const file = new VFile({ value: markdown });
  matter(file);
  return (file.data.matter ?? {}) as PostFrontmatter;
}
