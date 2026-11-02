import fs from "node:fs/promises";
import path from "node:path";
import {
  type ContentMigrationHistory,
  type ContentMigrationState,
  emptyContentMigrationHistory,
  emptyContentMigrationState,
  parseContentMigrationHistory,
  parseContentMigrationState,
} from "@riebeckite/core";

export function migrationStateDirectory(contentDirectory: string): string {
  return path.join(contentDirectory, ".riebeckite", "migrations");
}

export function migrationStatePath(contentDirectory: string): string {
  return path.join(migrationStateDirectory(contentDirectory), "state.json");
}

export function migrationHistoryPath(contentDirectory: string): string {
  return path.join(migrationStateDirectory(contentDirectory), "history.json");
}

export function migrationLockPath(contentDirectory: string): string {
  return path.join(migrationStateDirectory(contentDirectory), "lock");
}

export async function readMigrationState(
  contentDirectory: string,
): Promise<ContentMigrationState> {
  try {
    return parseContentMigrationState(
      JSON.parse(
        await fs.readFile(migrationStatePath(contentDirectory), "utf8"),
      ) as unknown,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return emptyContentMigrationState();
    throw error;
  }
}

export async function writeMigrationState(
  contentDirectory: string,
  state: ContentMigrationState,
): Promise<void> {
  const target = migrationStatePath(contentDirectory);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readMigrationHistory(
  contentDirectory: string,
): Promise<ContentMigrationHistory> {
  try {
    return parseContentMigrationHistory(
      JSON.parse(
        await fs.readFile(migrationHistoryPath(contentDirectory), "utf8"),
      ) as unknown,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return emptyContentMigrationHistory();
    throw error;
  }
}

export async function writeMigrationHistory(
  contentDirectory: string,
  history: ContentMigrationHistory,
): Promise<void> {
  const target = migrationHistoryPath(contentDirectory);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(history, null, 2)}\n`, "utf8");
}
