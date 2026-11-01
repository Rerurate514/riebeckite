import {
  isPersistentlyCacheable,
  type OutputChangeSet,
  readContentBuildStateStatus,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { ResolvedHonoxApplication } from "./application.js";
import type {
  RegenerationInspection,
  RegenerationReason,
} from "./development_inspector_types.js";

export async function inspectRegeneration(
  application: ResolvedHonoxApplication,
  changes: OutputChangeSet,
  buildReasons: readonly string[],
): Promise<RegenerationInspection> {
  try {
    const statePath = resolveContentBuildStatePath(
      application.config,
      undefined,
    );
    const stateStatus = await readContentBuildStateStatus(statePath);
    const cacheability = isPersistentlyCacheable("", application.config);
    const reasons: RegenerationReason[] = [];
    const unknown: string[] = [];
    for (const reason of new Set(buildReasons)) {
      switch (reason) {
        case "incremental-disabled":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "incremental regeneration is disabled",
          });
          break;
        case "cache-missing-or-invalid":
          if (stateStatus.kind === "missing") {
            reasons.push({
              kind: "build-state-missing",
              source: "content-build-state",
              detail: "the saved build state does not exist",
            });
          } else if (stateStatus.kind === "invalid") {
            reasons.push({
              kind:
                stateStatus.reason === "unsupported-version"
                  ? "build-state-incompatible"
                  : "build-state-invalid",
              source: "content-build-state",
              detail: stateStatus.reason,
            });
          } else {
            reasons.push({
              kind: "cache-missing-or-invalid",
              source: "content-build-plan",
              detail: "the saved build state could not be reused",
            });
          }
          break;
        case "pipeline-fingerprint-changed":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail:
              "the resolved pipeline fingerprint differs from the saved build state",
          });
          break;
        case "content-plugin-uncacheable":
          reasons.push({
            kind: reason,
            source: "content-persistent-cache",
            detail:
              cacheability.reason ??
              "a content plugin prevents persistent caching",
          });
          break;
        case "external-dependency-unavailable":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "an external dependency could not be resolved",
          });
          break;
        case "publishing-state-expired":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "the saved publishing state has expired",
          });
          break;
        default:
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "the content build plan reported this reason",
          });
      }
    }
    const unknownOutputCount = [
      ...changes.affected,
      ...changes.unchanged,
    ].filter((output) =>
      output.dependencies.some(({ type }) => type === "unknown"),
    ).length;
    if (changes.fullRegenerationRequired) {
      if (unknownOutputCount > 0) {
        reasons.push({
          kind: "output-dependency-unknown",
          source: "output-change-set",
          detail: `${unknownOutputCount} outputs have unknown dependencies`,
        });
      } else if (
        !reasons.some(
          (reason) => reason.kind === "external-dependency-unavailable",
        )
      ) {
        reasons.push({
          kind: "full-regeneration-required",
          source: "output-change-set",
          detail: "the output change set requires full regeneration",
        });
        unknown.push("output-change-set-cause");
      }
    }
    return {
      status: "available",
      required: reasons.length > 0,
      reasons,
      unknown,
    };
  } catch {
    return {
      status: "unavailable",
      reason: "regeneration inspection failed",
    };
  }
}
