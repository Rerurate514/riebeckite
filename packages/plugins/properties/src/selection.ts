import { isPlainObject } from "./object.js";
import type { ResolvedPropertiesOptions } from "./types.js";

export function selectProperties(
  frontmatter: Readonly<Record<string, unknown>> | null | undefined,
  options: ResolvedPropertiesOptions,
): Array<[string, unknown]> {
  if (!frontmatter || typeof frontmatter !== "object") return [];

  const entries: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (options.include) {
      if (!options.include.includes(key)) continue;
    } else if (options.exclude.includes(key)) {
      continue;
    }
    if (value === undefined) continue;
    if (options.hideEmpty && isEmptyPropertyValue(value)) continue;
    entries.push([key, value]);
  }
  return applyOrder(entries, options.order);
}

export function isEmptyPropertyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Date) return false;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function applyOrder(
  entries: ReadonlyArray<[string, unknown]>,
  order: readonly string[] | undefined,
): Array<[string, unknown]> {
  if (!order || order.length === 0) return [...entries];

  const remaining = new Map(entries);
  const ordered: Array<[string, unknown]> = [];
  for (const key of order) {
    if (!remaining.has(key)) continue;
    ordered.push([key, remaining.get(key)]);
    remaining.delete(key);
  }
  for (const entry of entries) {
    if (remaining.has(entry[0])) ordered.push(entry);
  }
  return ordered;
}
