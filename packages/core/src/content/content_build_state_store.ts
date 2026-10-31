import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  MAX_PROVENANCE_HISTORY,
  PROVENANCE_VERSION,
} from "../provenance/provenance.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import {
  CONTENT_BUILD_STATE_DIRECTORY,
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
} from "./content_build_state.js";

const MAX_CONTENT_BUILD_STATE_BYTES = 64 * 1024 * 1024;

export async function loadContentBuildState(
  statePath: string,
): Promise<ContentBuildState | undefined> {
  try {
    const metadata = await fs.stat(statePath);
    if (metadata.size > MAX_CONTENT_BUILD_STATE_BYTES) return undefined;
    const parsed: unknown = JSON.parse(await fs.readFile(statePath, "utf8"));
    return isContentBuildState(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export type ContentBuildStateInvalidReason =
  | "malformed-json"
  | "unsupported-version"
  | "invalid-shape";

export type ContentBuildStateStatus =
  | { kind: "missing"; path: string }
  | { kind: "valid"; path: string; version: number; entryCount: number }
  | {
      kind: "invalid";
      path: string;
      reason: ContentBuildStateInvalidReason;
    };

export async function readContentBuildStateStatus(
  statePath: string,
): Promise<ContentBuildStateStatus> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await fs.readFile(statePath, "utf8"));
  } catch (error) {
    if (isNotFoundError(error)) return { kind: "missing", path: statePath };
    if (error instanceof SyntaxError) {
      return { kind: "invalid", path: statePath, reason: "malformed-json" };
    }
    throw error;
  }

  if (!isRecord(parsed)) {
    return { kind: "invalid", path: statePath, reason: "invalid-shape" };
  }
  if (parsed.version !== CONTENT_BUILD_STATE_VERSION) {
    return { kind: "invalid", path: statePath, reason: "unsupported-version" };
  }
  if (!isContentBuildStateShape(parsed)) {
    return { kind: "invalid", path: statePath, reason: "invalid-shape" };
  }
  return {
    kind: "valid",
    path: statePath,
    version: parsed.version,
    entryCount: Object.keys(parsed.entries).length,
  };
}

export async function saveContentBuildState(
  statePath: string,
  state: ContentBuildState,
): Promise<void> {
  const directory = path.dirname(statePath);
  const temporaryPath = `${statePath}.${crypto.randomUUID()}.tmp`;
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.writeFile(temporaryPath, JSON.stringify(state), "utf8");
    await fs.rename(temporaryPath, statePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function resolveContentBuildStatePath(
  config: ResolvedRiebeckiteConfig | undefined,
  contentDirectory: string | undefined,
): string {
  if (config?.buildDirectory) {
    return path.join(config.buildDirectory, "build", "content-state.json");
  }
  const directory =
    config?.content.directory ?? contentDirectory ?? process.cwd();
  return path.resolve(
    directory,
    CONTENT_BUILD_STATE_DIRECTORY,
    "content-state.json",
  );
}

function isContentBuildState(value: unknown): value is ContentBuildState {
  return (
    isRecord(value) &&
    value.version === CONTENT_BUILD_STATE_VERSION &&
    isContentBuildStateShape(value)
  );
}

function isContentBuildStateShape(
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

function isBuildProvenance(value: unknown): boolean {
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
    value.outputs.every(isProvenanceOutput)
  );
}

function isProvenanceTransform(value: unknown): boolean {
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

function isProvenanceOutput(value: unknown): boolean {
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

function isOutputChangeReason(value: unknown): boolean {
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

function isSafeRelativePath(value: unknown): value is string {
  return typeof value === "string" && isOutputPath(value);
}

function isSha256(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isFingerprint(value: unknown): boolean {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isStringArray(value: unknown): boolean {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isManifestHookCache(value: unknown): boolean {
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

function isManifestHookSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    (value.order === undefined ||
      (Array.isArray(value.order) &&
        value.order.every((slug) => typeof slug === "string")))
  );
}

function isOutputDescriptors(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (output) =>
        isRecord(output) &&
        (output.kind === "content" ||
          output.kind === "redirect" ||
          output.kind === "plugin-page" ||
          output.kind === "generated") &&
        isOutputPath(output.path) &&
        typeof output.producer === "string" &&
        Array.isArray(output.dependencies) &&
        output.dependencies.every(isOutputDependency),
    )
  );
}

function isOutputPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/")
  ) {
    return false;
  }
  return value
    .split("/")
    .every((segment) => segment !== "." && segment !== "..");
}

function isOutputDependency(value: unknown): value is OutputDependency {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "global" || value.type === "unknown") return true;
  if (value.type === "content-query") {
    return (
      Array.isArray(value.properties) &&
      value.properties.every((property) => typeof property === "string") &&
      (value.unknown === undefined || typeof value.unknown === "boolean")
    );
  }
  return (
    (value.type === "content" && typeof value.slug === "string") ||
    (value.type === "tag" && typeof value.tag === "string") ||
    (value.type === "folder" && typeof value.folder === "string") ||
    (value.type === "file" && typeof value.path === "string") ||
    (value.type === "public-location" && typeof value.pathname === "string") ||
    (value.type === "external" && typeof value.id === "string") ||
    (value.type === "derived-view" &&
      typeof value.id === "string" &&
      typeof value.version === "string") ||
    (value.type === "derived-query" &&
      typeof value.id === "string" &&
      typeof value.fingerprint === "string") ||
    (value.type === "projection" &&
      (value.projection === "navigation" ||
        value.projection === "recent-posts" ||
        value.projection === "taxonomy-tags" ||
        value.projection === "taxonomy-folders"))
  );
}

function isExternalDependencies(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (dependency) =>
        isRecord(dependency) &&
        typeof dependency.id === "string" &&
        dependency.id.length > 0 &&
        typeof dependency.fingerprint === "string" &&
        dependency.fingerprint.length > 0 &&
        isExternalScope(dependency.scope) &&
        (dependency.expiresAt === undefined ||
          (typeof dependency.expiresAt === "string" &&
            !Number.isNaN(Date.parse(dependency.expiresAt)))),
    )
  );
}

function isExternalScope(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "content" || value.type === "all") return true;
  return (
    value.type === "output" &&
    Array.isArray(value.paths) &&
    value.paths.every((path) => isOutputPath(path))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
