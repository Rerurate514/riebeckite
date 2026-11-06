import fs from "node:fs/promises";
import path from "node:path";
import { type CommandRunner, spawnCommand } from "./run-commands.js";

const CONTENT_DIRECTORY = "content";
const NOTIFY_SOURCE = path.join("github", "notify-site.yml");
const NOTIFY_DESTINATION = path.join(
  "content",
  ".github",
  "workflows",
  "notify-site.yml",
);

export type ContentCloneOutcome =
  | { readonly status: "cloned" }
  | { readonly status: "skipped"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };

export type ContentCloneOptions = {
  readonly targetDirectory: string;
  readonly contentRepository: string;
  readonly run?: CommandRunner;
};

export async function cloneContentRepository(
  options: ContentCloneOptions,
): Promise<ContentCloneOutcome> {
  const destination = path.join(options.targetDirectory, CONTENT_DIRECTORY);
  const availability = await destinationAvailability(destination);
  if (availability.status === "unavailable") {
    return { status: "skipped", reason: availability.reason };
  }

  const run = options.run ?? spawnCommand;
  let exitCode: number;
  try {
    exitCode = await run(
      "git",
      [
        "clone",
        "--branch",
        "main",
        "--single-branch",
        "--depth",
        "1",
        "--",
        `https://github.com/${options.contentRepository}.git`,
        availability.status === "empty" ? "." : CONTENT_DIRECTORY,
      ],
      availability.status === "empty" ? destination : options.targetDirectory,
    );
  } catch (error) {
    return { status: "failed", reason: messageFor(error) };
  }
  if (exitCode !== 0) {
    return {
      status: "failed",
      reason: `git clone exited with code ${exitCode}.`,
    };
  }

  try {
    const notifyDestination = path.join(
      options.targetDirectory,
      NOTIFY_DESTINATION,
    );
    await fs.mkdir(path.dirname(notifyDestination), { recursive: true });
    await fs.copyFile(
      path.join(options.targetDirectory, NOTIFY_SOURCE),
      notifyDestination,
    );
  } catch (error) {
    return { status: "failed", reason: messageFor(error) };
  }

  return { status: "cloned" };
}

type ContentDestinationAvailability =
  | { readonly status: "missing" }
  | { readonly status: "empty" }
  | { readonly status: "unavailable"; readonly reason: string };

async function destinationAvailability(
  destination: string,
): Promise<ContentDestinationAvailability> {
  let stats: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stats = await fs.lstat(destination);
  } catch (error) {
    if (isNotFoundError(error)) return { status: "missing" };
    throw error;
  }

  if (stats.isSymbolicLink()) {
    return {
      status: "unavailable",
      reason: "the content path is a symbolic link or junction.",
    };
  }
  if (!stats.isDirectory()) {
    return {
      status: "unavailable",
      reason: "the content path exists and is not a directory.",
    };
  }
  if ((await fs.readdir(destination)).length > 0) {
    return {
      status: "unavailable",
      reason: "the content directory is not empty.",
    };
  }
  return { status: "empty" };
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
