import fs from "node:fs/promises";
import path from "node:path";
import {
  resolveBuildOutputDirectory,
  resolveManagedStateRoot,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "./application_root.js";

const BUILD_OUTPUT_MARKER_VERSION = 1;
const BUILD_OUTPUT_MARKER_FILE = "build-output.json";

export type BuildOutputMarker = {
  readonly outputDirectory: string;
};

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
): Promise<void> {
  const markerPath = resolveBuildOutputMarkerPath(project);
  const outputDirectory = resolveBuildOutputDirectory(project.config);
  if (!markerPath || !outputDirectory) return;

  const marker = `${JSON.stringify(
    {
      version: BUILD_OUTPUT_MARKER_VERSION,
      outputDirectory,
      appRoot: project.appRoot,
    },
    null,
    2,
  )}\n`;
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
    const raw = await fs.readFile(markerPath, "utf8");
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      outputDirectory?: unknown;
    };
    if (parsed.version !== BUILD_OUTPUT_MARKER_VERSION) return undefined;
    if (typeof parsed.outputDirectory !== "string") return undefined;
    if (
      path.resolve(parsed.outputDirectory) !== path.resolve(outputDirectory)
    ) {
      return undefined;
    }
    return { outputDirectory: parsed.outputDirectory };
  } catch {
    return undefined;
  }
}
