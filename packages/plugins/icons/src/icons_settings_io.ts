import { promises as fs } from "node:fs";
import path from "node:path";
import type { IconDiagnostic } from "./icon_packs.js";
import { MAX_SETTINGS_BYTES } from "./icons_settings_types.js";

export async function readJsonFile(
  filePath: string,
  source: string,
  diagnostics: IconDiagnostic[],
): Promise<unknown> {
  const text = await readTextFile(filePath, MAX_SETTINGS_BYTES);
  if (text === undefined) {
    diagnostics.push({
      code: "icons-unreadable-settings",
      severity: "warning",
      message: `${source} settings could not be read; continuing without them.`,
      meta: { source },
    });
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    diagnostics.push({
      code: "icons-invalid-settings",
      severity: "warning",
      message: `${source} settings are not valid JSON; continuing without them.`,
      meta: { source },
    });
    return undefined;
  }
}

export async function readTextFile(
  filePath: string,
  maxBytes: number,
): Promise<string | undefined> {
  try {
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) return undefined;
    if (stat.size > maxBytes) return undefined;
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export async function isDirectory(value: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(value);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export async function isFile(value: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(value);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeVaultPath(value: string): string | undefined {
  const normalized = value
    .normalize("NFC")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
  if (!normalized || normalized.includes("\0")) return undefined;
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    return undefined;
  }
  return segments.filter(Boolean).join("/");
}
