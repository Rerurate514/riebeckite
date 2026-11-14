import path from "node:path";
import {
  compareBuildProvenance,
  computePipelineFingerprint,
  isPersistentlyCacheable,
  loadContentBuildState,
  type ResolvedRiebeckiteConfig,
  readContentBuildStateStatus,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";
import type { BuildInspection, ProvenanceInspection } from "./types.js";

export async function collectBuildInspection(
  config: ResolvedRiebeckiteConfig,
): Promise<BuildInspection> {
  const status = await readContentBuildStateStatus(
    resolveContentBuildStatePath(config, undefined),
  );
  if (status.kind === "missing") return { status: "not created" };
  if (status.kind === "invalid")
    return { status: "invalid", reason: status.reason };
  const state = await loadContentBuildState(status.path);
  const cacheability = isPersistentlyCacheable("", config);
  const fingerprintMatches =
    state?.pipelineFingerprint === computePipelineFingerprint(config);
  const reusable = cacheability.cacheable && fingerprintMatches;
  return {
    status: "valid",
    version: status.version,
    entryCount: status.entryCount,
    reusable,
    ...(reusable
      ? {}
      : {
          regenerationReason: cacheability.cacheable
            ? "the resolved pipeline changed since the saved build state"
            : (cacheability.reason ?? "persistent content caching is disabled"),
        }),
  };
}

export async function collectProvenanceInspection(
  project: RiebeckiteProject,
  options: {
    readonly source?: string;
    readonly output?: string;
    readonly compare?: string;
  } = {},
): Promise<ProvenanceInspection> {
  const config = await loadProjectConfig(project);
  const statePath = resolveContentBuildStatePath(config, undefined);
  const state = await loadContentBuildState(statePath);
  if (!state) return { status: "unavailable", reason: "no valid build state" };
  if (!state.provenance)
    return { status: "unavailable", reason: "provenance was not recorded" };
  const provenance = {
    ...state.provenance,
    ...(options.source === undefined
      ? {}
      : {
          sources: state.provenance.sources.filter(
            (source) => source.path === options.source,
          ),
        }),
    ...(options.output === undefined
      ? {}
      : {
          outputs: state.provenance.outputs.filter(
            (output) => output.path === options.output,
          ),
        }),
  };
  const history = state.provenanceHistory ?? [state.provenance];
  const prior = options.compare
    ? history.find((entry) => entry.buildId === options.compare)
    : undefined;
  return {
    status: "available",
    provenance,
    history,
    ...(prior === undefined
      ? options.compare === undefined
        ? {}
        : { comparisonUnavailable: "compare build was not found in history" }
      : { comparison: compareBuildProvenance(prior, state.provenance) }),
  };
}

export function displayPath(value: string, invocationCwd: string): string {
  return path.relative(invocationCwd, value) || ".";
}

export function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}
