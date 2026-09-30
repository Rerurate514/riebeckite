import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import {
  CONTENT_BUILD_STATE_DIRECTORY,
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
} from "./content_build_state.js";

export async function loadContentBuildState(
  statePath: string,
): Promise<ContentBuildState | undefined> {
  try {
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
  const temporaryPath = `${statePath}.${randomUUID()}.tmp`;
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
  if (!isRecord(value.entries) || !isRecord(value.contentIndex)) return false;

  return (
    Object.values(value.entries).every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.fingerprint === "string" &&
        entry.fingerprint.length > 0 &&
        Array.isArray(entry.dependencies) &&
        entry.dependencies.every(
          (dependency) => typeof dependency === "string",
        ),
    ) &&
    Object.values(value.contentIndex).every(
      (entry) => typeof entry === "string",
    )
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
