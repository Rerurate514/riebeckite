import path from "node:path";
import { normalizeContentPath } from "@riebeckite/core";

export function isPathInsideDirectory(
  directory: string,
  file: string,
): boolean {
  const root = normalizeForCompare(directory).replace(/\/+$/, "");
  if (!root) return false;
  const target = normalizeForCompare(file);
  return target === root || target.startsWith(`${root}/`);
}

export function toLogicalPath(directory: string, file: string): string {
  return normalizeContentPath(
    path.relative(normalizeContentPath(directory), normalizeContentPath(file)),
  );
}

function normalizeForCompare(value: string): string {
  const normalized = normalizeContentPath(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
