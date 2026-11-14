import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isRecord } from "./helpers_plan.js";

export type JournalSnapshot = {
  readonly state: string;
  readonly changes: readonly {
    readonly path: string;
    readonly afterFingerprint: string | null;
  }[];
};

export async function readJournalSnapshot(
  journalPath: string,
): Promise<JournalSnapshot | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(journalPath, "utf8")) as unknown;
    if (
      !isRecord(value) ||
      typeof value.state !== "string" ||
      !Array.isArray(value.changes)
    )
      return undefined;
    const changes: { path: string; afterFingerprint: string | null }[] = [];
    for (const change of value.changes) {
      if (
        !isRecord(change) ||
        typeof change.path !== "string" ||
        !(
          change.afterFingerprint === null ||
          typeof change.afterFingerprint === "string"
        )
      )
        return undefined;
      changes.push({
        path: change.path,
        afterFingerprint: change.afterFingerprint as string | null,
      });
    }
    return { state: value.state, changes };
  } catch {
    return undefined;
  }
}

export async function journalMatchesApplied(
  contentDirectory: string,
  journal: JournalSnapshot,
): Promise<boolean> {
  for (const change of journal.changes) {
    const target = path.resolve(contentDirectory, change.path);
    if (!isWithin(contentDirectory, target)) return false;
    let actual: string | null = null;
    try {
      actual = createHash("sha256")
        .update(await fs.readFile(target))
        .digest("hex");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
    }
    if (actual !== change.afterFingerprint) return false;
  }
  return true;
}

export function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
