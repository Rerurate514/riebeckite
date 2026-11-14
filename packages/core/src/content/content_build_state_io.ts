import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import {
  CONTENT_BUILD_STATE_DIRECTORY,
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
} from "./content_build_state.js";
import { isNotFoundError, isRecord } from "./content_build_state_guards.js";
import type { ContentBuildStateStatus } from "./content_build_state_types.js";
import {
  isContentBuildState,
  isContentBuildStateShape,
} from "./content_build_state_validate.js";

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
