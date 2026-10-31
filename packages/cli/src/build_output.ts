import fs from "node:fs/promises";
import path from "node:path";
import {
  BUILD_OUTPUT_MARKER_FILE,
  type BuildOutputMarker,
  createBuildOutputMarker,
  parseBuildOutputMarker,
  resolveBuildOutputDirectory,
  resolveManagedStateRoot,
  serializeBuildOutputMarker,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "./application_root.js";

export type { BuildOutputMarker };

export function resolveBuildOutputMarkerPath(
  project: RiebeckiteProject,
): string | undefined {
  const stateRoot = resolveManagedStateRoot(project.config);
  return stateRoot ? path.join(stateRoot, BUILD_OUTPUT_MARKER_FILE) : undefined;
}

export async function clearBuildOutputMarker(
  project: RiebeckiteProject,
): Promise<void> {
  const markerPath = resolveBuildOutputMarkerPath(project);
  if (!markerPath) return;
  await fs.rm(markerPath, { force: true });
}

export async function writeBuildOutputMarker(
  project: RiebeckiteProject,
  metadata: {
    readonly publicationFingerprint?: string;
    readonly completedAt?: Date | string;
  } = {},
): Promise<void> {
  const markerPath = resolveBuildOutputMarkerPath(project);
  const outputDirectory = resolveBuildOutputDirectory(project.config);
  if (!markerPath || !outputDirectory) return;

  const marker = serializeBuildOutputMarker(
    createBuildOutputMarker({
      outputDirectory,
      ...metadata,
    }),
  );
  const temporaryPath = `${markerPath}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(markerPath), { recursive: true });
  try {
    await fs.writeFile(temporaryPath, marker, "utf8");
    await fs.rm(markerPath, { force: true });
    await fs.rename(temporaryPath, markerPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readBuildOutputMarker(
  project: RiebeckiteProject,
): Promise<BuildOutputMarker | undefined> {
  const markerPath = resolveBuildOutputMarkerPath(project);
  const outputDirectory = resolveBuildOutputDirectory(project.config);
  if (!markerPath || !outputDirectory) return undefined;

  try {
    return parseBuildOutputMarker(
      JSON.parse(await fs.readFile(markerPath, "utf8")),
      outputDirectory,
    );
  } catch {
    return undefined;
  }
}
