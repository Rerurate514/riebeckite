import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { resolveWithinDirectory } from "./file_system.js";

export type BuildArtifactWriter = {
  readonly directory: string;
  copyFrom(source: string): Promise<void>;
  copyFileFrom(source: string, path: string): Promise<void>;
  remove(path: string): Promise<void>;
  write(path: string, data: string | Uint8Array): Promise<void>;
  publish(): Promise<void>;
  discard(): Promise<void>;
};

export async function createBuildArtifactWriter(input: {
  readonly outputDirectory: string;
  readonly stagingDirectory?: string;
  readonly clearStagingDirectory?: boolean;
}): Promise<BuildArtifactWriter> {
  const outputDirectory = input.outputDirectory;
  await recoverPendingPublication(outputDirectory);
  const stagingDirectory =
    input.stagingDirectory ??
    join(
      dirname(outputDirectory),
      ".riebeckite",
      `build-output-${randomUUID()}`,
    );
  if (resolve(stagingDirectory) === resolve(outputDirectory)) {
    throw new Error(
      "Build artifact staging directory must differ from output.",
    );
  }
  if (input.clearStagingDirectory !== false) {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
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
    async copyFileFrom(source, path) {
      ensureOpen(completed);
      const target = resolveArtifactPath(stagingDirectory, path);
      await mkdir(dirname(target), { recursive: true });
      await rm(target, { force: true });
      await copyFile(source, target, constants.COPYFILE_FICLONE);
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
  const journalPath = publicationJournalPath(outputDirectory);
  await writeJournal(journalPath, {
    backupDirectory,
    outputDirectory,
    stagingDirectory,
    state: "staged",
  });
  try {
    if (previousOutputExists) {
      await moveWithRetry(outputDirectory, backupDirectory);
      previousOutputMoved = true;
      await writeJournal(journalPath, {
        backupDirectory,
        outputDirectory,
        stagingDirectory,
        state: "previous-output-moved",
      });
    }
    await moveWithRetry(stagingDirectory, outputDirectory);
    await writeJournal(journalPath, {
      backupDirectory,
      outputDirectory,
      stagingDirectory,
      state: "published",
    });
  } catch (error) {
    if (previousOutputMoved) {
      await rm(outputDirectory, { force: true, recursive: true });
      await moveWithRetry(backupDirectory, outputDirectory);
    }
    await rm(journalPath, { force: true });
    throw error;
  }
  await rm(backupDirectory, { force: true, recursive: true });
  await rm(journalPath, { force: true });
}

type PublicationJournal = {
  readonly backupDirectory: string;
  readonly outputDirectory: string;
  readonly stagingDirectory: string;
  readonly state: "staged" | "previous-output-moved" | "published";
};

function publicationJournalPath(outputDirectory: string): string {
  return join(dirname(outputDirectory), ".riebeckite", "build-output.json");
}

async function writeJournal(
  path: string,
  journal: PublicationJournal,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(journal));
}

async function recoverPendingPublication(
  outputDirectory: string,
): Promise<void> {
  const path = publicationJournalPath(outputDirectory);
  let journal: PublicationJournal;
  try {
    journal = JSON.parse(await readFile(path, "utf8")) as PublicationJournal;
  } catch (error) {
    if (isNotFoundError(error)) return;
    await rm(path, { force: true });
    return;
  }
  if (
    journal.outputDirectory !== outputDirectory ||
    !isPublicationJournalState(journal.state)
  ) {
    await rm(path, { force: true });
    return;
  }
  if (
    journal.state === "previous-output-moved" &&
    !(await isDirectory(outputDirectory)) &&
    (await isDirectory(journal.backupDirectory))
  ) {
    await moveWithRetry(journal.backupDirectory, outputDirectory);
  }
  await rm(journal.backupDirectory, { force: true, recursive: true });
  await rm(journal.stagingDirectory, { force: true, recursive: true });
  await rm(path, { force: true });
}

function isPublicationJournalState(
  value: unknown,
): value is PublicationJournal["state"] {
  return (
    value === "staged" ||
    value === "previous-output-moved" ||
    value === "published"
  );
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
