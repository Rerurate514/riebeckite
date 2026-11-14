import {
  MAX_PROVENANCE_HISTORY,
  PROVENANCE_VERSION,
} from "../provenance/provenance.js";
import {
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
} from "./content_build_state.js";
import {
  isFingerprint,
  isOutputPath,
  isRecord,
  isSafeRelativePath,
  isSha256,
  isStringArray,
} from "./content_build_state_guards.js";
import {
  isExternalDependencies,
  isOutputDependency,
  isOutputDescriptors,
} from "./content_build_state_outputs.js";

export function isContentBuildState(
  value: unknown,
): value is ContentBuildState {
  return (
    isRecord(value) &&
    value.version === CONTENT_BUILD_STATE_VERSION &&
    isContentBuildStateShape(value)
  );
}

export function isContentBuildStateShape(
  value: Record<string, unknown>,
): value is ContentBuildState {
  if (
    !isRecord(value.entries) ||
    !isRecord(value.contentIndex) ||
    !isExternalDependencies(value.externalDependencies) ||
    (value.provenance !== undefined && !isBuildProvenance(value.provenance)) ||
    (value.provenanceHistory !== undefined &&
      (!Array.isArray(value.provenanceHistory) ||
        value.provenanceHistory.length > MAX_PROVENANCE_HISTORY ||
        !value.provenanceHistory.every(isBuildProvenance))) ||
    (value.outputs !== undefined && !isOutputDescriptors(value.outputs)) ||
    (value.manifestHookCache !== undefined &&
      !isManifestHookCache(value.manifestHookCache)) ||
    (value.nextPublishingChangeAt !== undefined &&
      (typeof value.nextPublishingChangeAt !== "string" ||
        Number.isNaN(Date.parse(value.nextPublishingChangeAt))))
  ) {
    return false;
  }

  return (
    Object.values(value.entries).every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.fingerprint === "string" &&
        entry.fingerprint.length > 0 &&
        (entry.metadataFingerprint === undefined ||
          typeof entry.metadataFingerprint === "string") &&
        Array.isArray(entry.aliases) &&
        entry.aliases.every((alias) => typeof alias === "string") &&
        Array.isArray(entry.dependencies) &&
        entry.dependencies.every(
          (dependency) =>
            isRecord(dependency) &&
            (dependency.kind === "content" || dependency.kind === "file") &&
            typeof dependency.id === "string",
        ),
    ) &&
    Object.values(value.contentIndex).every(
      (entry) => typeof entry === "string",
    )
  );
}

export function isBuildProvenance(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.version === PROVENANCE_VERSION &&
    isSha256(value.buildId) &&
    Array.isArray(value.sources) &&
    value.sources.every(
      (source) =>
        isRecord(source) &&
        typeof source.id === "string" &&
        typeof source.contentId === "string" &&
        isSafeRelativePath(source.path) &&
        isFingerprint(source.fingerprint) &&
        (source.type === "markdown" || source.type === "file") &&
        (source.visibility === "public" ||
          source.visibility === "draft" ||
          source.visibility === "scheduled" ||
          source.visibility === "unlisted" ||
          source.visibility === "unknown") &&
        source.evidence === "deterministic",
    ) &&
    Array.isArray(value.transforms) &&
    value.transforms.every(isProvenanceTransform) &&
    Array.isArray(value.outputs) &&
    value.outputs.every(isProvenanceOutput) &&
    (value.artifacts === undefined ||
      (Array.isArray(value.artifacts) &&
        value.artifacts.every(isProvenanceArtifact)))
  );
}

export function isProvenanceArtifact(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOutputPath(value.path) &&
    isSha256(value.fingerprint) &&
    (value.descriptor === "matched" || value.descriptor === "unmapped") &&
    (value.cache === "hit" ||
      value.cache === "miss" ||
      value.cache === "not-measured") &&
    value.evidence === "measured"
  );
}

export function isProvenanceTransform(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.type === "content-processing" ||
      value.type === "plugin-hook" ||
      value.type === "derived-view") &&
    typeof value.producer === "string" &&
    isStringArray(value.inputs) &&
    isStringArray(value.outputs) &&
    (value.status === "executed" ||
      value.status === "reused" ||
      value.status === "not-executed" ||
      value.status === "opaque" ||
      value.status === "failed") &&
    (value.durationMs === undefined ||
      (typeof value.durationMs === "number" &&
        Number.isFinite(value.durationMs))) &&
    (value.evidence === "measured" ||
      value.evidence === "deterministic" ||
      value.evidence === "unobservable") &&
    (value.sequence === undefined ||
      (typeof value.sequence === "number" &&
        Number.isSafeInteger(value.sequence) &&
        value.sequence > 0)) &&
    (value.hook === undefined || typeof value.hook === "string") &&
    (value.effect === undefined || value.effect === "opaque")
  );
}

export function isProvenanceOutput(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOutputPath(value.path) &&
    (value.kind === "content" ||
      value.kind === "redirect" ||
      value.kind === "plugin-page" ||
      value.kind === "generated") &&
    typeof value.producer === "string" &&
    Array.isArray(value.dependencies) &&
    value.dependencies.every(isOutputDependency) &&
    (value.status === "generated" ||
      value.status === "reused" ||
      value.status === "removed") &&
    value.evidence === "deterministic" &&
    (value.recomputeReason === undefined ||
      isOutputChangeReason(value.recomputeReason))
  );
}

export function isOutputChangeReason(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (
    value.type === "new-output" ||
    value.type === "unknown-dependency" ||
    value.type === "global"
  ) {
    return true;
  }
  if (value.type === "kind-changed") {
    return (
      value.previousKind === "content" ||
      value.previousKind === "redirect" ||
      value.previousKind === "plugin-page" ||
      value.previousKind === "generated"
    );
  }
  if (value.type === "external" || value.type === "derived-query") {
    return typeof value.id === "string";
  }
  if (value.type === "content") return typeof value.slug === "string";
  if (value.type === "tag") return typeof value.tag === "string";
  if (value.type === "folder") return typeof value.folder === "string";
  if (value.type === "derived-view") {
    return typeof value.id === "string" && typeof value.version === "string";
  }
  if (value.type === "file") {
    return typeof value.path === "string" && isSafeRelativePath(value.path);
  }
  if (value.type === "public-location") {
    return typeof value.pathname === "string" && value.pathname.startsWith("/");
  }
  if (value.type === "content-query") {
    return (
      Array.isArray(value.properties) &&
      value.properties.every((property) => typeof property === "string") &&
      typeof value.unknown === "boolean"
    );
  }
  return (
    value.type === "projection" &&
    (value.projection === "navigation" ||
      value.projection === "recent-posts" ||
      value.projection === "taxonomy-tags" ||
      value.projection === "taxonomy-folders")
  );
}

export function isManifestHookCache(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.pluginName === "string" &&
        typeof entry.cacheVersion === "string" &&
        typeof entry.cacheable === "boolean" &&
        (entry.pipelineFingerprint === undefined ||
          typeof entry.pipelineFingerprint === "string") &&
        typeof entry.inputFingerprint === "string" &&
        (entry.outputFingerprint === undefined ||
          typeof entry.outputFingerprint === "string") &&
        (entry.snapshot === undefined ||
          isManifestHookSnapshot(entry.snapshot)),
    )
  );
}

export function isManifestHookSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    (value.order === undefined ||
      (Array.isArray(value.order) &&
        value.order.every((slug) => typeof slug === "string")))
  );
}
