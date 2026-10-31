import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type ContentMigrationDefinition,
  type ContentMigrationRegistry,
  createContentMigrationRegistry,
  defineContentMigration,
} from "@riebeckite/core";

const CANDIDATES = ["index.mjs", "index.js", "index.mts", "index.ts"];

export async function loadContentMigrationRegistry(
  projectRoot: string,
): Promise<ContentMigrationRegistry> {
  const directory = path.join(projectRoot, "migrations");
  for (const candidate of CANDIDATES) {
    const file = path.join(directory, candidate);
    if (!(await exists(file))) continue;
    const module = (await import(
      `${pathToFileURL(file).href}?t=${Date.now()}`
    )) as { default?: unknown; migrations?: unknown };
    const value = module.default ?? module.migrations;
    const entries = Array.isArray(value)
      ? value
      : isRecord(value) && Array.isArray(value.migrations)
        ? value.migrations
        : undefined;
    if (!entries)
      throw new Error(
        `The migration module "${file}" must export an array or { migrations }.`,
      );
    return createContentMigrationRegistry(
      entries.map((entry) =>
        defineContentMigration(entry as ContentMigrationDefinition),
      ),
    );
  }
  return createContentMigrationRegistry([]);
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
