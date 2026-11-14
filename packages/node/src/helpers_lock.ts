import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { retryOnSharingViolation } from "./helpers_errors.js";
import { isRecord } from "./helpers_plan.js";

export type ContentLock = {
  readonly assertOwned: () => Promise<void>;
  readonly release: () => Promise<void>;
};

export type StaleLockReclaimHooks = {
  readonly afterGuardAcquired?: () => Promise<void>;
  readonly beforeLockRemoval?: () => Promise<void>;
};

export async function acquireContentLock(
  lockPath: string,
  conflictMessage: string,
): Promise<ContentLock> {
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  for (let attempt = 0; attempt < 3 && !handle; attempt += 1) {
    try {
      handle = await fs.open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await reclaimStaleLock(lockPath)) continue;
      throw new Error(conflictMessage);
    }
  }
  if (!handle) throw new Error(conflictMessage);
  const token = randomUUID();
  try {
    await handle.writeFile(
      JSON.stringify({
        pid: process.pid,
        token,
        startedAt: new Date().toISOString(),
      }),
    );
    await handle.sync();
  } finally {
    await handle.close().catch(() => undefined);
  }
  const owns = async (): Promise<boolean> => {
    const record = await readLockRecord(lockPath);
    return record?.pid === process.pid && record.token === token;
  };
  if (!(await owns()))
    throw new Error("The content lock is no longer owned by this process.");
  return {
    assertOwned: async () => {
      if (!(await owns()))
        throw new Error("The content lock is no longer owned by this process.");
    },
    release: async () => {
      try {
        const content = await fs.readFile(lockPath, "utf8");
        let value: unknown;
        try {
          value = JSON.parse(content);
        } catch {
          return;
        }
        if (
          !isRecord(value) ||
          value.pid !== process.pid ||
          value.token !== token
        )
          return;
        await removeFileIfContent(lockPath, content);
      } catch {
        // A failed release is reclaimed by the next writer through the stale guard.
      }
    },
  };
}

export async function staleLockContent(
  lockPath: string,
): Promise<string | null> {
  let content: string;
  try {
    content = await fs.readFile(lockPath, "utf8");
  } catch {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return (await lockFileIsOld(lockPath)) ? content : null;
  }
  const pid = isRecord(value) ? value.pid : undefined;
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0)
    return (await lockFileIsOld(lockPath)) ? content : null;
  return (await processIsAlive(pid)) ? null : content;
}

async function lockFileIsOld(lockPath: string): Promise<boolean> {
  try {
    return Date.now() - (await fs.stat(lockPath)).mtimeMs > 5_000;
  } catch {
    return false;
  }
}

async function processIsAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

async function readLockRecord(
  lockPath: string,
): Promise<{ readonly pid?: number; readonly token?: string } | null> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(lockPath, "utf8"));
    if (!isRecord(value)) return null;
    return {
      pid:
        typeof value.pid === "number" && Number.isInteger(value.pid)
          ? value.pid
          : undefined,
      token: typeof value.token === "string" ? value.token : undefined,
    };
  } catch {
    return null;
  }
}

async function fileHasToken(filePath: string, token: string): Promise<boolean> {
  return (await readLockRecord(filePath))?.token === token;
}

async function removeOwnedFile(filePath: string, token: string): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return;
  }
  if (!isRecord(value) || value.token !== token) return;
  await removeFileIfContent(filePath, content).catch(() => undefined);
}

async function restoreClaimedFile(
  target: string,
  claimed: string,
): Promise<void> {
  try {
    await fs.link(claimed, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return;
    throw error;
  }
  await fs.rm(claimed, { force: true });
}

async function removeFileIfContent(
  filePath: string,
  expected: string,
): Promise<boolean> {
  const claimed = `${filePath}.${randomUUID()}.stale`;
  try {
    await retryOnSharingViolation(() => fs.rename(filePath, claimed));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
  try {
    const content = await fs.readFile(claimed, "utf8");
    if (content !== expected) {
      await restoreClaimedFile(filePath, claimed);
      return false;
    }
    await retryOnSharingViolation(() => fs.rm(claimed, { force: true }));
    return true;
  } catch (error) {
    await restoreClaimedFile(filePath, claimed).catch(() => undefined);
    throw error;
  }
}

async function reclaimStaleGuard(guardPath: string): Promise<boolean> {
  const record = await readLockRecord(guardPath);
  const stale =
    record?.pid === undefined
      ? await lockFileIsOld(guardPath)
      : !(await processIsAlive(record.pid));
  if (!stale) return false;
  const claimed = `${guardPath}.${randomUUID()}.stale`;
  try {
    await retryOnSharingViolation(() => fs.rename(guardPath, claimed));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return true;
    throw error;
  }
  try {
    const claimedRecord = await readLockRecord(claimed);
    const claimedStale =
      claimedRecord?.pid === undefined
        ? await lockFileIsOld(claimed)
        : !(await processIsAlive(claimedRecord.pid));
    if (!claimedStale) {
      await restoreClaimedFile(guardPath, claimed);
      return false;
    }
    await fs.rm(claimed, { force: true });
    return true;
  } catch (error) {
    await restoreClaimedFile(guardPath, claimed).catch(() => undefined);
    throw error;
  }
}

export async function reclaimStaleLock(
  lockPath: string,
  hooks: StaleLockReclaimHooks = {},
): Promise<boolean> {
  const guardPath = `${lockPath}.reclaim`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomUUID();
    let guard: Awaited<ReturnType<typeof fs.open>>;
    try {
      guard = await fs.open(guardPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await reclaimStaleGuard(guardPath)) continue;
      return false;
    }
    try {
      await guard.writeFile(
        JSON.stringify({
          pid: process.pid,
          token,
          startedAt: new Date().toISOString(),
        }),
      );
      await guard.sync();
    } finally {
      await guard.close().catch(() => undefined);
    }
    try {
      await hooks.afterGuardAcquired?.();
      if (!(await fileHasToken(guardPath, token))) return false;
      const stale = await staleLockContent(lockPath);
      if (stale === null) return false;
      await hooks.beforeLockRemoval?.();
      if (!(await fileHasToken(guardPath, token))) return false;
      const current = await staleLockContent(lockPath);
      if (current === null || current !== stale) return false;
      return await removeFileIfContent(lockPath, stale);
    } finally {
      await removeOwnedFile(guardPath, token);
    }
  }
  return false;
}
