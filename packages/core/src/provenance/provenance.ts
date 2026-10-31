import crypto from "node:crypto";
import type { ContentBuildPlan } from "../content/content_build_plan.js";
import type {
  OutputChangeReason,
  OutputChangeSet,
  OutputDescriptor,
} from "../content/output_dependency.js";
import type { DerivedViewInspection } from "../plugin/plugin_runtime.js";
import type { ContentManifest } from "../types/content_manifest.js";
import type { ResolvedPluginMetadata } from "../types/plugin.js";

export const PROVENANCE_VERSION = 1;

export type ProvenanceSource = {
  readonly id: string;
  readonly contentId: string;
  readonly path: string;
  readonly fingerprint: string;
  readonly type: "markdown" | "file";
  readonly visibility:
    | "public"
    | "draft"
    | "scheduled"
    | "unlisted"
    | "unknown";
};

export type ProvenanceTransform = {
  readonly id: string;
  readonly type: "content-processing" | "plugin-hook" | "derived-view";
  readonly producer: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly status: "executed" | "reused" | "not-executed" | "opaque" | "failed";
  readonly durationMs?: number;
};

export type ProvenanceOutput = {
  readonly id: string;
  readonly path: string;
  readonly kind: OutputDescriptor["kind"];
  readonly producer: string;
  readonly dependencies: readonly OutputDescriptor["dependencies"][number][];
  readonly status: "generated" | "reused" | "removed";
  readonly recomputeReason?: OutputChangeReason;
};

export type BuildProvenance = {
  readonly version: typeof PROVENANCE_VERSION;
  readonly buildId: string;
  readonly sources: readonly ProvenanceSource[];
  readonly transforms: readonly ProvenanceTransform[];
  readonly outputs: readonly ProvenanceOutput[];
};

export function createBuildProvenance(input: {
  readonly plan: ContentBuildPlan;
  readonly manifest: ContentManifest;
  readonly outputChanges: OutputChangeSet;
  readonly plugins: readonly ResolvedPluginMetadata[];
  readonly derivedViews: readonly DerivedViewInspection[];
  readonly processed: ReadonlyMap<string, number>;
}): BuildProvenance {
  const visibilityBySlug = new Map(
    input.manifest.entries.map(
      (entry) => [entry.slug, entry.publishing.visibility] as const,
    ),
  );
  const sources = input.plan.currentEntries
    .map(({ entry, fingerprint }) => {
      const slug = entry.path.replace(/\.md$/, "");
      return {
        id: `source:${entry.path}`,
        contentId: slug,
        path: entry.path,
        fingerprint,
        type: entry.path.endsWith(".md") ? "markdown" : "file",
        visibility: visibilityBySlug.get(slug) ?? "unknown",
      } satisfies ProvenanceSource;
    })
    .sort(byId);
  const transforms: ProvenanceTransform[] = [
    ...sources
      .filter((source) => source.type === "markdown")
      .map((source) => {
        const durationMs = input.processed.get(source.contentId);
        return {
          id: `transform:content:${source.contentId}`,
          type: "content-processing",
          producer: "core:markdown-pipeline",
          inputs: [source.id],
          outputs: [`content:${source.contentId}`],
          status:
            durationMs === undefined
              ? input.plan.affectedContent.direct.has(source.contentId) ||
                input.plan.affectedContent.dependent.has(source.contentId)
                ? "not-executed"
                : "reused"
              : "executed",
          ...(durationMs === undefined ? {} : { durationMs }),
        } satisfies ProvenanceTransform;
      }),
    ...input.plugins.map((plugin) => ({
      id: `transform:plugin:${plugin.name}`,
      type: "plugin-hook" as const,
      producer: `plugin:${plugin.name}`,
      inputs: [],
      outputs: [],
      status: "opaque" as const,
    })),
    ...input.derivedViews.map((view) => derivedTransform(view)),
  ].sort(byId);
  const affected = new Set(
    input.outputChanges.affected.map((output) => output.path),
  );
  const outputs = [
    ...input.outputChanges.affected.map((output) =>
      outputRecord(
        output,
        "generated",
        input.outputChanges.reasons?.get(output.path),
      ),
    ),
    ...input.outputChanges.unchanged.map((output) =>
      outputRecord(output, "reused"),
    ),
    ...input.outputChanges.removed.map((output) =>
      outputRecord(output, "removed"),
    ),
  ]
    .filter(
      (output) => output.status !== "generated" || affected.has(output.path),
    )
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    version: PROVENANCE_VERSION,
    buildId: hash({ sources, transforms, outputs }),
    sources,
    transforms,
    outputs,
  };
}

function derivedTransform(view: DerivedViewInspection): ProvenanceTransform {
  const status: ProvenanceTransform["status"] =
    view.error === "failed"
      ? "failed"
      : view.cache === "hit"
        ? "reused"
        : view.cache === "not-run"
          ? "not-executed"
          : "executed";
  return {
    id: `transform:derived:${view.id}`,
    type: "derived-view",
    producer: `derived:${view.id}@${view.version}`,
    inputs: view.dependencies.map(
      (dependency) => `${dependency.type}:${dependency.id}`,
    ),
    outputs: view.outputPaths.map((path) => `output:${path}`),
    status,
    durationMs: view.durationMs,
  };
}

function outputRecord(
  output: OutputDescriptor,
  status: ProvenanceOutput["status"],
  recomputeReason?: OutputChangeReason,
): ProvenanceOutput {
  return {
    id: `output:${output.path}`,
    path: output.path,
    kind: output.kind,
    producer: output.producer,
    dependencies: output.dependencies,
    status,
    ...(recomputeReason === undefined ? {} : { recomputeReason }),
  };
}

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function hash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}
