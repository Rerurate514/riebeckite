import fs from "node:fs/promises";
import path from "node:path";
import {
  resolveBuildOutputDirectory,
  resolveManagedStateRoot,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";

export type CleanScope = "state" | "output" | "all";

export type CleanOptions = {
  readonly scope: CleanScope;
};

export async function runClean(
  project: RiebeckiteProject,
  options: CleanOptions,
): Promise<void> {
  const boundary = path.resolve(project.appRoot);
  const removesState = options.scope !== "output";
  const removesOutput = options.scope !== "state";

  if (removesState) {
    const stateRoot = resolveManagedStateRoot(project.config);
    if (stateRoot) await removeManagedPath(boundary, stateRoot);
  }
  if (removesOutput) {
    const outputDirectory = resolveBuildOutputDirectory(project.config);
    if (outputDirectory) await removeManagedPath(boundary, outputDirectory);
  }

  console.log(cleanMessage(options.scope));
}

function cleanMessage(scope: CleanScope): string {
  if (scope === "state") return "Cleaned Riebeckite state.";
  if (scope === "output") return "Cleaned build output.";
  return "Cleaned Riebeckite state and build output.";
}

/**
 * Removes a Riebeckite-managed directory without ever escaping the application
 * boundary. Missing paths are not an error. Symbolic links and Windows
 * junctions are removed as links, so their targets are never deleted.
 */
export async function removeManagedPath(
  boundary: string,
  target: string,
): Promise<boolean> {
  const resolvedBoundary = path.resolve(boundary);
  const resolvedTarget = path.resolve(target);
  assertInsideBoundary(resolvedBoundary, resolvedTarget);

  let stats: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stats = await fs.lstat(resolvedTarget);
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }

  if (stats.isSymbolicLink()) {
    await removeSymbolicLink(resolvedTarget);
    return true;
  }

  await fs.rm(resolvedTarget, { recursive: true, force: true });
  return true;
}

function assertInsideBoundary(boundary: string, target: string): void {
  const relative = path.relative(boundary, target);
  const escapes =
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
  if (escapes) {
    throw new UnsafeCleanPathError(
      `Refusing to remove ${target} because it is not inside the application directory ${boundary}.`,
    );
  }
}

async function removeSymbolicLink(target: string): Promise<void> {
  try {
    await fs.unlink(target);
  } catch (error) {
    if (isNotFoundError(error)) return;
    await fs.rmdir(target);
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export class UnsafeCleanPathError extends Error {
  readonly hint: string;

  constructor(message: string) {
    super(message);
    this.name = "UnsafeCleanPathError";
    this.hint =
      "Riebeckite only removes its own state and build output inside the application directory.";
  }
}
