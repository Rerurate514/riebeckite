import { randomUUID } from "node:crypto";
import { cp, lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveWithinDirectory } from "./file_system.js";

export type BuildArtifactWriter = {
  readonly directory: string;
  copyFrom(source: string): Promise<void>;
  remove(path: string): Promise<void>;
  write(path: string, data: string | Uint8Array): Promise<void>;
  publish(): Promise<void>;
  discard(): Promise<void>;
};

export async function createBuildArtifactWriter(input: {
  readonly outputDirectory: string;
}): Promise<BuildArtifactWriter> {
  const outputDirectory = input.outputDirectory;
  const stagingDirectory = join(
    dirname(outputDirectory),
    ".riebeckite",
    `build-output-${randomUUID()}`,
  );
  await mkdir(stagingDirectory, { recursive: true });
  let completed = false;

  return {
    directory: stagingDirectory,
    async copyFrom(source) {
      ensureOpen(completed);
      await cp(source, stagingDirectory, { recursive: true });
    },
    async remove(path) {
      ensureOpen(completed);
      await rm(resolveArtifactPath(stagingDirectory, path), {
        force: true,
        recursive: true,
      });
    },
    async write(path, data) {
      ensureOpen(completed);
      const target = resolveArtifactPath(stagingDirectory, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
    },
    async publish() {
      ensureOpen(completed);
      await publishDirectory(stagingDirectory, outputDirectory);
      completed = true;
    },
    async discard() {
      if (completed) return;
      completed = true;
      await rm(stagingDirectory, { force: true, recursive: true });
    },
  };
}

function ensureOpen(completed: boolean): void {
  if (completed) throw new Error("Build artifact writer is already closed.");
}

function resolveArtifactPath(directory: string, path: string): string {
  return resolveWithinDirectory(directory, path, "Build artifact path");
}

async function publishDirectory(
  stagingDirectory: string,
  outputDirectory: string,
): Promise<void> {
  const backupDirectory = join(
    dirname(outputDirectory),
    ".riebeckite",
    `build-output-backup-${randomUUID()}`,
  );
  const previousOutputExists = await isDirectory(outputDirectory);
  let previousOutputMoved = false;
  try {
    if (previousOutputExists) {
      await moveWithRetry(outputDirectory, backupDirectory);
      previousOutputMoved = true;
    }
    await moveWithRetry(stagingDirectory, outputDirectory);
  } catch (error) {
    if (previousOutputMoved) {
      await rm(outputDirectory, { force: true, recursive: true });
      await moveWithRetry(backupDirectory, outputDirectory);
    }
    throw error;
  }
  await rm(backupDirectory, { force: true, recursive: true });
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isDirectory();
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

async function moveWithRetry(
  source: string,
  destination: string,
): Promise<void> {
  let error: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rename(source, destination);
      return;
    } catch (nextError) {
      error = nextError;
      if (!isRetryableRenameError(nextError) || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 25));
    }
  }
  throw error;
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function isRetryableRenameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ["EBUSY", "EPERM", "EACCES"].includes(
      (error as { code?: unknown }).code as string,
    )
  );
}
