import {
  buildOutputPlan,
  type CompletedContentBuildSnapshot,
  inspectContentAssets,
  type OutputChangeSet,
} from "@riebeckite/core";
import {
  type DevelopmentDiagnostic,
  diagnoseOutputPlan,
} from "@riebeckite/diagnostics";
import { createContentSource } from "@riebeckite/node";
import type { ResolvedInspectorApplication } from "./application.js";
import {
  dependencyLabel,
  dependencyMatches,
  listedOutput,
  outputLookups,
  outputMatches,
  pageOf,
} from "./development_inspector_query.js";
import { inspectRegeneration } from "./development_inspector_regeneration.js";
import type {
  AssetResult,
  DependencyInspection,
  OutputInspection,
  OutputQuery,
  OutputResult,
} from "./development_inspector_types.js";

export async function inspectContentOutputs(
  snapshot: CompletedContentBuildSnapshot,
  application: ResolvedInspectorApplication,
): Promise<OutputResult> {
  try {
    const changes = snapshot.outputChangeSet;
    const plan = buildOutputPlan({
      inventory: [...changes.affected, ...changes.unchanged],
      removed: changes.removed,
      affectedPaths: new Set(changes.affected.map((output) => output.path)),
      cacheAvailable: changes.unchanged.length > 0,
    });
    return {
      output: inspectOutput(changes, plan),
      dependencies: inspectDependencies(changes),
      diagnostics: diagnoseOutputPlan(plan),
      regeneration: await inspectRegeneration(
        application,
        changes,
        snapshot.fullRegenerationReasons,
      ),
      affected: changes.affected,
      unchanged: changes.unchanged,
      removed: changes.removed,
      reasons: changes.reasons ?? new Map(),
    };
  } catch {
    return {
      output: {
        status: "unavailable",
        reason: "output inspection failed",
      },
      dependencies: {
        status: "unavailable",
        reason: "dependency inspection failed",
      },
      diagnostics: [],
      regeneration: {
        status: "unavailable",
        reason: "regeneration inspection failed",
      },
      affected: [],
      unchanged: [],
      removed: [],
      reasons: new Map(),
    };
  }
}

export function unavailableOutputResult(): OutputResult {
  const reason =
    "no completed development build is available for this revision";
  return {
    output: { status: "unavailable", reason },
    dependencies: { status: "unavailable", reason },
    diagnostics: [],
    regeneration: { status: "unavailable", reason },
    affected: [],
    unchanged: [],
    removed: [],
    reasons: new Map(),
  };
}

export async function inspectAssets(
  snapshot: CompletedContentBuildSnapshot,
  application: ResolvedInspectorApplication,
): Promise<AssetResult> {
  try {
    const source = createContentSource(
      application.config.content,
      application.contentRoot,
    );
    return {
      status: "available",
      inspection: await inspectContentAssets(snapshot.manifest, source),
    };
  } catch {
    return { status: "unavailable", reason: "asset inspection failed" };
  }
}

export function unavailableAssetResult(): AssetResult {
  return {
    status: "unavailable",
    reason: "no completed development build is available for this revision",
  };
}

export function inspectOutput(
  changes: OutputChangeSet,
  plan: ReturnType<typeof buildOutputPlan>,
): OutputInspection {
  return {
    status: "available",
    candidateOutputCount: changes.candidateOutputCount,
    affectedOutputCount: changes.affectedOutputCount,
    unchangedOutputCount: changes.unchangedOutputCount,
    removedOutputCount: changes.removedOutputCount,
    fullRegenerationRequired: changes.fullRegenerationRequired,
    conflicts: plan.conflicts.map((conflict) => ({
      path: conflict.path,
      owners: conflict.owners,
    })),
    affected: [],
    hiddenAffectedCount: changes.affected.length,
    unchanged: [],
    hiddenUnchangedCount: changes.unchanged.length,
    removed: [],
    hiddenRemovedCount: changes.removed.length,
  };
}

export function inspectDependencies(
  changes: OutputChangeSet,
): DependencyInspection {
  const outputs = [...changes.affected, ...changes.unchanged];
  const kinds = new Map<string, number>();
  let dependencyCount = 0;
  let dependentOutputCount = 0;
  let unknownOutputCount = 0;
  for (const output of outputs) {
    for (const dependency of output.dependencies) {
      dependencyCount += 1;
      kinds.set(dependency.type, (kinds.get(dependency.type) ?? 0) + 1);
    }
    if (output.dependencies.some(({ type }) => type === "unknown")) {
      unknownOutputCount += 1;
    }
    if (output.dependencies.length > 0) dependentOutputCount += 1;
  }
  return {
    status: "available",
    outputCount: outputs.length,
    dependentOutputCount,
    dependencyCount,
    unknownOutputCount,
    kinds: [...kinds.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => ({ kind, count })),
    outputs: [],
    hiddenOutputCount: dependentOutputCount,
  };
}

export function serializeOutputResult(
  result: OutputResult,
  query: OutputQuery,
): Pick<OutputResult, "output" | "dependencies" | "regeneration"> & {
  readonly diagnostics: readonly DevelopmentDiagnostic[];
} {
  const allOutputs = [...result.affected, ...result.unchanged];
  const affected = (
    query.status === "all" || query.status === "affected" ? result.affected : []
  ).filter((output) =>
    outputMatches(output, query, result.reasons.get(output.path)),
  );
  const unchanged = (
    query.status === "all" || query.status === "unchanged"
      ? result.unchanged
      : []
  ).filter((output) => outputMatches(output, query, undefined));
  const removed = (
    query.status === "all" || query.status === "removed" ? result.removed : []
  ).filter((output) => outputMatches(output, query, undefined));
  const affectedPage = pageOf(affected, query.page, query.limit);
  const unchangedPage = pageOf(unchanged, query.page, query.limit);
  const removedPage = pageOf(removed, query.page, query.limit);
  const dependencies = allOutputs.filter((output) =>
    dependencyMatches(output, query),
  );
  const dependencyPage = pageOf(
    dependencies,
    query.dependencyPage,
    query.dependencyLimit,
  );
  return {
    output:
      result.output.status === "available"
        ? {
            ...result.output,
            affected: affectedPage.items.map((output) =>
              listedOutput(output, result.reasons.get(output.path)),
            ),
            hiddenAffectedCount: affectedPage.hidden,
            unchanged: unchangedPage.items.map((output) =>
              listedOutput(output, "no tracked dependency changed"),
            ),
            hiddenUnchangedCount: unchangedPage.hidden,
            removed: removedPage.items.map((output) =>
              listedOutput(
                output,
                "not present in the current output inventory",
              ),
            ),
            hiddenRemovedCount: removedPage.hidden,
            lookups:
              query.output || query.changed
                ? outputLookups(result, query)
                : undefined,
          }
        : result.output,
    dependencies:
      result.dependencies.status === "available"
        ? {
            ...result.dependencies,
            outputs: dependencyPage.items.map((output) => ({
              path: output.path,
              dependencies: output.dependencies.map(dependencyLabel),
            })),
            hiddenOutputCount: dependencyPage.hidden,
          }
        : result.dependencies,
    regeneration: result.regeneration,
    diagnostics: result.diagnostics,
  };
}
