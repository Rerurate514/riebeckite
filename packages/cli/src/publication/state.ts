import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  emptyPublicationApprovals,
  emptyPublicationHistory,
  type PublicationApprovals,
  type PublicationHistory,
  parsePublicationApprovals,
  parsePublicationHistory,
  resolveManagedStateRoot,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";

const STATE_DIRECTORY = "publication";
const DEFAULT_APPROVAL_FILE = "publication/approvals.json";

export class PublicationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationStateError";
  }
}

export function resolvePublicationStateDirectory(
  project: RiebeckiteProject,
): string {
  const stateRoot =
    resolveManagedStateRoot(project.config) ??
    path.join(project.appRoot, ".riebeckite");
  return path.join(stateRoot, STATE_DIRECTORY);
}

export function resolvePublicationHistoryPath(
  project: RiebeckiteProject,
): string {
  return path.join(resolvePublicationStateDirectory(project), "history.json");
}

export function resolvePublicationLockPath(project: RiebeckiteProject): string {
  return path.join(resolvePublicationStateDirectory(project), "lock.json");
}

export function resolvePublicationApprovalPath(
  project: RiebeckiteProject,
  override?: string,
): string {
  return path.resolve(project.projectRoot, override ?? DEFAULT_APPROVAL_FILE);
}

export async function readPublicationHistory(
  project: RiebeckiteProject,
): Promise<PublicationHistory> {
  const file = resolvePublicationHistoryPath(project);
  const parsed = await readJson(file);
  if (parsed === undefined) return emptyPublicationHistory();
  const history = parsePublicationHistory(parsed);
  if (!history) {
    console.warn(
      `Ignoring malformed publication history at ${file}; the next run publishes from scratch.`,
    );
    return emptyPublicationHistory();
  }
  return history;
}

export async function writePublicationHistory(
  project: RiebeckiteProject,
  history: PublicationHistory,
): Promise<void> {
  await writeJsonAtomic(resolvePublicationHistoryPath(project), history);
}

export async function readPublicationApprovals(
  project: RiebeckiteProject,
  override?: string,
): Promise<{ approvals: PublicationApprovals; file: string }> {
  const file = resolvePublicationApprovalPath(project, override);
  const parsed = await readJson(file);
  if (parsed === undefined) {
    return { approvals: emptyPublicationApprovals(), file };
  }
  const approvals = parsePublicationApprovals(parsed);
  if (!approvals) {
    throw new PublicationStateError(
      `Approval records at ${file} are malformed. Fix the JSON or remove the file.`,
    );
  }
  return { approvals, file };
}

export async function writePublicationApprovals(
  project: RiebeckiteProject,
  approvals: PublicationApprovals,
  override?: string,
): Promise<string> {
  const file = resolvePublicationApprovalPath(project, override);
  await writeJsonAtomic(file, approvals);
  return file;
}

export type PublicationLock = {
  readonly id: string;
  readonly pid: number;
  readonly startedAt: string;
  readonly planFingerprint: string;
};

const LOCK_STALE_MS = 60 * 60 * 1000;

export async function acquirePublicationLock(
  project: RiebeckiteProject,
  planFingerprint: string,
): Promise<PublicationLock> {
  const file = resolvePublicationLockPath(project);
  const lock: PublicationLock = {
    id: crypto.randomUUID(),
    pid: process.pid,
    startedAt: new Date().toISOString(),
    planFingerprint,
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await fs.writeFile(file, `${JSON.stringify(lock, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      return lock;
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
    const existing = (await readJson(file)) as
      | Partial<PublicationLock>
      | undefined;
    if (existing === undefined) continue;
    const startedAt =
      typeof existing.startedAt === "string"
        ? Date.parse(existing.startedAt)
        : NaN;
    if (
      Number.isFinite(startedAt) &&
      Date.now() - startedAt < LOCK_STALE_MS &&
      isLockOwnerAlive(existing.pid)
    ) {
      throw new PublicationStateError(
        `Another publication run has held the lock since ${existing.startedAt}. Retry after it finishes.`,
      );
    }
    await fs.rm(file, { force: true });
  }
  throw new PublicationStateError(
    "Could not acquire the publication lock because another run kept recreating it.",
  );
}

export async function releasePublicationLock(
  project: RiebeckiteProject,
  lock: PublicationLock,
): Promise<void> {
  const file = resolvePublicationLockPath(project);
  const existing = (await readJson(file)) as
    | Partial<PublicationLock>
    | undefined;
  if (existing?.id !== lock.id) return;
  await fs.rm(file, { force: true });
}

export async function readPublicationLock(
  project: RiebeckiteProject,
): Promise<PublicationLock | undefined> {
  const parsed = await readJson(resolvePublicationLockPath(project));
  return parsed as PublicationLock | undefined;
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (isNotFound(error)) return undefined;
    if (error instanceof SyntaxError) {
      throw new PublicationStateError(`${file} contains invalid JSON.`);
    }
    throw error;
  }
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isAlreadyExists(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EEXIST"
  );
}

function isLockOwnerAlive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
