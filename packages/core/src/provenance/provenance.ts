import crypto from "node:crypto";
import type { ContentBuildPlan } from "../content/content_build_plan.js";
import type {
  OutputChangeReason,
  OutputChangeSet,
  OutputDescriptor,
} from "../content/output_dependency.js";
import type {
  DerivedViewInspection,
  PluginHookExecution,
} from "../plugin/plugin_runtime.js";
import type { ContentManifest } from "../types/content_manifest.js";

export const PROVENANCE_VERSION = 1;
export const MAX_PROVENANCE_HISTORY = 10;

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
  readonly evidence: "deterministic";
};

export type ProvenanceTransform = {
  readonly id: string;
  readonly type: "content-processing" | "plugin-hook" | "derived-view";
  readonly producer: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly status: "executed" | "reused" | "not-executed" | "opaque" | "failed";
  readonly evidence: "measured" | "deterministic" | "unobservable";
  readonly sequence?: number;
  readonly hook?: string;
  readonly effect?: "opaque";
  readonly durationMs?: number;
};

export type ProvenanceOutput = {
  readonly id: string;
  readonly path: string;
  readonly kind: OutputDescriptor["kind"];
  readonly producer: string;
  readonly dependencies: readonly OutputDescriptor["dependencies"][number][];
  readonly status: "generated" | "reused" | "removed";
  readonly evidence: "deterministic";
  readonly recomputeReason?: OutputChangeReason;
};

export type ProvenanceArtifact = {
  readonly id: string;
  readonly path: string;
  readonly fingerprint: string;
  readonly descriptor: "matched" | "unmapped";
  readonly cache: "hit" | "miss" | "not-measured";
  readonly evidence: "measured";
};

export type BuildProvenance = {
  readonly version: typeof PROVENANCE_VERSION;
  readonly buildId: string;
  readonly sources: readonly ProvenanceSource[];
  readonly transforms: readonly ProvenanceTransform[];
  readonly outputs: readonly ProvenanceOutput[];
  readonly artifacts?: readonly ProvenanceArtifact[];
};

export type BuildProvenanceComparison = {
  readonly from: string;
  readonly to: string;
  readonly sources: ProvenanceDelta;
  readonly transforms: ProvenanceDelta;
  readonly outputs: ProvenanceDelta;
  readonly artifacts: ProvenanceDelta;
};

export type ProvenanceDelta = {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
};

export function createBuildProvenance(input: {
  readonly plan: ContentBuildPlan;
  readonly manifest: ContentManifest;
  readonly outputChanges: OutputChangeSet;
  readonly pluginHooks: readonly PluginHookExecution[];
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
        evidence: "deterministic",
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
          evidence: durationMs === undefined ? "deterministic" : "measured",
          ...(durationMs === undefined ? {} : { durationMs }),
        } satisfies ProvenanceTransform;
      }),
    ...input.pluginHooks.map((hook) => ({
      id: `transform:plugin:${hook.sequence}`,
      type: "plugin-hook" as const,
      producer: `plugin:${hook.plugin}`,
      inputs: [],
      outputs: [],
      status: hook.status,
      evidence: "measured" as const,
      sequence: hook.sequence,
      hook: hook.hook,
      effect: "opaque" as const,
      durationMs: hook.durationMs,
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

export function compareBuildProvenance(
  from: BuildProvenance,
  to: BuildProvenance,
): BuildProvenanceComparison {
  return {
    from: from.buildId,
    to: to.buildId,
    sources: compareRecords(from.sources, to.sources),
    transforms: compareRecords(from.transforms, to.transforms),
    outputs: compareRecords(from.outputs, to.outputs),
    artifacts: compareRecords(from.artifacts ?? [], to.artifacts ?? []),
  };
}

export function attachProvenanceArtifacts(
  provenance: BuildProvenance,
  input: {
    readonly fingerprints: Readonly<Record<string, string>>;
    readonly cacheHits: ReadonlySet<string>;
  },
): BuildProvenance {
  const outputs = new Set(provenance.outputs.map((output) => output.path));
  const artifacts = Object.entries(input.fingerprints)
    .map(
      ([path, fingerprint]) =>
        ({
          id: `artifact:${path}`,
          path,
          fingerprint,
          descriptor: outputs.has(path) ? "matched" : "unmapped",
          cache: input.cacheHits.has(path)
            ? "hit"
            : outputs.has(path)
              ? "miss"
              : "not-measured",
          evidence: "measured",
        }) satisfies ProvenanceArtifact,
    )
    .sort(byId);
  return { ...provenance, artifacts };
}

export function appendProvenanceHistory(
  previous: readonly BuildProvenance[],
  provenance: BuildProvenance,
): readonly BuildProvenance[] {
  return [
    ...previous.filter((entry) => entry.buildId !== provenance.buildId),
    provenance,
  ].slice(-MAX_PROVENANCE_HISTORY);
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
    evidence: "measured",
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
    evidence: "deterministic",
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

function compareRecords<T extends { id: string }>(
  from: readonly T[],
  to: readonly T[],
): ProvenanceDelta {
  const previous = new Map(from.map((entry) => [entry.id, entry]));
  const current = new Map(to.map((entry) => [entry.id, entry]));
  return {
    added: [...current.keys()].filter((id) => !previous.has(id)).sort(),
    removed: [...previous.keys()].filter((id) => !current.has(id)).sort(),
    changed: [...current.entries()]
      .filter(([id, entry]) => {
        const prior = previous.get(id);
        return (
          prior !== undefined && JSON.stringify(prior) !== JSON.stringify(entry)
        );
      })
      .map(([id]) => id)
      .sort(),
  };
}
