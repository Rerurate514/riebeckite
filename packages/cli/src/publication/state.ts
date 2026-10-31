import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  emptyPublicationApprovals,
  emptyPublicationHistory,
  emptyPublicationState,
  type PublicationApprovals,
  type PublicationHistory,
  type PublicationSnapshot,
  type PublicationState,
  parsePublicationApprovals,
  parsePublicationHistory,
  parsePublicationState,
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

export function resolvePublicationDurableStatePath(
  project: RiebeckiteProject,
): string {
  return path.join(project.projectRoot, "publication", "state.json");
}

export async function readPublicationState(
  project: RiebeckiteProject,
): Promise<PublicationState> {
  const file = resolvePublicationDurableStatePath(project);
  const parsed = await readJson(file);
  if (parsed === undefined) return emptyPublicationState();
  const state = parsePublicationState(parsed);
  if (!state) {
    console.warn(
      `Ignoring malformed durable publication state at ${file}; the next run publishes from scratch.`,
    );
    return emptyPublicationState();
  }
  return state;
}

export async function writePublicationState(
  project: RiebeckiteProject,
  snapshot: PublicationSnapshot,
): Promise<void> {
  await writeJsonAtomic(resolvePublicationDurableStatePath(project), {
    version: 1,
    lastSuccess: snapshot,
  });
}

export function resolvePublicationApprovalPath(
  project: RiebeckiteProject,
  override?: string,
): string {
  return path.resolve(
    project.projectRoot,
    override ??
      project.config.publication?.approvalFile ??
      DEFAULT_APPROVAL_FILE,
  );
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
  const parsed = await readJson(file, { strict: true });
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
  readonly hostname: string;
  readonly startedAt: string;
  readonly heartbeatAt: string;
  readonly planFingerprint: string;
};

const LOCK_STALE_MS = 60 * 60 * 1000;
const LOCK_HEARTBEAT_MS = 30 * 1000;
const heartbeatTimers = new Map<string, NodeJS.Timeout>();
const releasedLocks = new Set<string>();

export async function acquirePublicationLock(
  project: RiebeckiteProject,
  planFingerprint: string,
): Promise<PublicationLock> {
  const file = resolvePublicationLockPath(project);
  const lock: PublicationLock = {
    id: crypto.randomUUID(),
    pid: process.pid,
    hostname: os.hostname(),
    startedAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
    planFingerprint,
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await fs.writeFile(file, `${JSON.stringify(lock, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      startHeartbeat(project, lock);
      return lock;
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
    const existing = (await readJson(file)) as
      | Partial<PublicationLock>
      | undefined;
    if (existing === undefined) {
      await fs.rm(file, { force: true });
      continue;
    }
    if (isLockLive(existing)) {
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
  releasedLocks.add(lock.id);
  clearHeartbeat(lock.id);
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

export async function readLivePublicationLock(
  project: RiebeckiteProject,
): Promise<PublicationLock | undefined> {
  const lock = (await readJson(resolvePublicationLockPath(project))) as
    | Partial<PublicationLock>
    | undefined;
  if (lock === undefined || !isLockLive(lock)) return undefined;
  return lock as PublicationLock;
}

async function readJson(
  file: string,
  options: { strict?: boolean } = {},
): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (isNotFound(error)) return undefined;
    if (error instanceof SyntaxError) {
      if (options.strict) {
        throw new PublicationStateError(`${file} contains invalid JSON.`);
      }
      console.warn(
        `Ignoring unreadable JSON at ${file}; publication state falls back to a full redeploy.`,
      );
      return undefined;
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

function isLockLive(lock: Partial<PublicationLock>): boolean {
  const heartbeat =
    typeof lock.heartbeatAt === "string"
      ? Date.parse(lock.heartbeatAt)
      : typeof lock.startedAt === "string"
        ? Date.parse(lock.startedAt)
        : NaN;
  if (!Number.isFinite(heartbeat)) return false;
  if (lock.hostname !== os.hostname()) {
    return Date.now() - heartbeat < LOCK_STALE_MS;
  }
  return isPidAlive(lock.pid) && Date.now() - heartbeat < LOCK_STALE_MS;
}

function startHeartbeat(
  project: RiebeckiteProject,
  lock: PublicationLock,
): void {
  const timer = setInterval(() => {
    void touchPublicationLock(project, lock).catch(() => undefined);
  }, LOCK_HEARTBEAT_MS);
  timer.unref();
  heartbeatTimers.set(lock.id, timer);
}

function clearHeartbeat(id: string): void {
  const timer = heartbeatTimers.get(id);
  if (!timer) return;
  clearInterval(timer);
  heartbeatTimers.delete(id);
}

async function touchPublicationLock(
  project: RiebeckiteProject,
  lock: PublicationLock,
): Promise<void> {
  if (releasedLocks.has(lock.id)) return;
  const file = resolvePublicationLockPath(project);
  const existing = (await readJson(file)) as
    | Partial<PublicationLock>
    | undefined;
  if (existing?.id !== lock.id) {
    clearHeartbeat(lock.id);
    return;
  }
  if (releasedLocks.has(lock.id)) return;
  await writeJsonAtomic(file, {
    ...lock,
    heartbeatAt: new Date().toISOString(),
  });
}

function isPidAlive(pid: unknown): boolean {
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
