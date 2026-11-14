import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeContentPath } from "@riebeckite/core";
import {
  ATTACHMENTS_PUBLIC_ROOT,
  type CopyResult,
} from "./build_images_config.js";

export async function copyIfChanged(
  sourcePath: string,
  targetPath: string,
): Promise<CopyResult> {
  const sourceStats = await fs.stat(sourcePath);
  const targetStats = await getFileStats(targetPath);

  if (
    targetStats !== null &&
    sourceStats.size === targetStats.size &&
    Math.abs(sourceStats.mtimeMs - targetStats.mtimeMs) < 1
  ) {
    return "skipped";
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.utimes(targetPath, sourceStats.atime, sourceStats.mtime);
  return "copied";
}

export function getExtension(filePath: string): string {
  return path.extname(filePath).replace(".", "").toLowerCase();
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getFileStats(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (isFileNotFoundError(error)) return null;
    throw error;
  }
}

export function isFileNotFoundError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item): item is string => typeof item === "string")
  );
}

export function normalizeAssetPath(assetPath: string): string {
  return normalizeContentPath(assetPath);
}

export function isReservedPublicImage(assetPath: string): boolean {
  return (
    !assetPath.includes("/") ||
    assetPath === ATTACHMENTS_PUBLIC_ROOT ||
    assetPath.startsWith(`${ATTACHMENTS_PUBLIC_ROOT}/`)
  );
}

export function isDirectExecution(): boolean {
  return process.argv[1]
    ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
    : false;
}
