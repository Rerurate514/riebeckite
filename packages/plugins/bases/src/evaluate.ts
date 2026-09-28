import type {
  ContentLink,
  ContentManifestEntry,
} from "@riebeckite/core";
import type {
  BasesBuiltinValue,
  BasesCondition,
  BasesLiteral,
  BasesOperator,
  BasesValueRef,
} from "./types.js";

/** Evaluates a compiled condition against one manifest entry. */
export function matchesCondition(
  condition: BasesCondition,
  entry: ContentManifestEntry,
): boolean {
  switch (condition.kind) {
    case "and":
      return condition.conditions.every((child) =>
        matchesCondition(child, entry),
      );
    case "or":
      return condition.conditions.some((child) =>
        matchesCondition(child, entry),
      );
    case "not":
      return !matchesCondition(condition.condition, entry);
    case "hasTag":
      return hasTag(entry.tags, condition.tag);
    case "inFolder":
      return inFolder(entry.slug, condition.folder);
    case "hasLink":
      return hasLink(entry.links, condition.link);
    case "compare":
      return compare(
        resolveValueRef(condition.left, entry),
        condition.operator,
        condition.right,
      );
    default:
      return false;
  }
}

/** Reads the entry value a filter reference points at. */
export function resolveValueRef(
  reference: BasesValueRef,
  entry: ContentManifestEntry,
): unknown {
  if (reference.source === "frontmatter") {
    return entry.frontmatter[reference.key];
  }
  return resolveBuiltin(reference.name, entry);
}

function resolveBuiltin(
  name: BasesBuiltinValue,
  entry: ContentManifestEntry,
): unknown {
  switch (name) {
    case "file.name":
      return entry.title;
    case "file.path":
    case "file.slug":
      return entry.slug;
    case "file.folder":
      return folderOf(entry.slug);
    case "file.title":
      return entry.title;
    case "file.link":
    case "file.permalink":
      return entry.permalink;
    case "file.tags":
      return entry.tags;
    default:
      return undefined;
  }
}

function hasTag(tags: readonly string[], tag: string): boolean {
  const target = tag.trim().replace(/^#/, "").toLowerCase();
  if (target === "") return false;
  return tags.some((value) => {
    const normalized = value.toLowerCase();
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

function inFolder(slug: string, folder: string): boolean {
  const target = folder.trim().replace(/^\/+|\/+$/g, "");
  if (target === "") return true;
  return slug === target || slug.startsWith(`${target}/`);
}

function hasLink(links: readonly ContentLink[], link: string): boolean {
  const target = normalizeLink(link);
  if (target === "") return false;
  return links.some((candidate) => {
    if (candidate.slug !== null && candidate.slug.toLowerCase() === target) {
      return true;
    }
    const raw = normalizeLink(candidate.raw);
    return raw === target || baseName(raw) === baseName(target);
  });
}

function normalizeLink(value: string): string {
  return value
    .trim()
    .replace(/^\[\[|\]\]$/g, "")
    .split("|")[0]
    .split("#")[0]
    .replace(/\.md$/i, "")
    .replace(/^\.?\//, "")
    .toLowerCase();
}

function baseName(value: string): string {
  const parts = value.split("/");
  return parts[parts.length - 1] ?? value;
}

function folderOf(slug: string): string {
  const index = slug.lastIndexOf("/");
  return index === -1 ? "" : slug.slice(0, index);
}

function compare(
  actual: unknown,
  operator: BasesOperator,
  expected: BasesLiteral,
): boolean {
  if (operator === "contains") return containsValue(actual, expected);

  if (operator === "==" || operator === "!=") {
    const equal = equalsAny(actual, expected);
    return operator === "==" ? equal : !equal;
  }

  const order = compareOrder(actual, expected);
  if (order === null) return false;
  switch (operator) {
    case ">":
      return order > 0;
    case "<":
      return order < 0;
    case ">=":
      return order >= 0;
    case "<=":
      return order <= 0;
    default:
      return false;
  }
}

function equalsAny(actual: unknown, expected: BasesLiteral): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) => scalarEquals(item, expected));
  }
  return scalarEquals(actual, expected);
}

function scalarEquals(actual: unknown, expected: BasesLiteral): boolean {
  if (actual === undefined || actual === null) return expected === null;
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.toLowerCase() === expected.toLowerCase();
  }
  if (actual instanceof Date) {
    const time = toComparableNumber(expected);
    return time !== null && actual.getTime() === time;
  }
  return actual === expected;
}

function containsValue(actual: unknown, expected: BasesLiteral): boolean {
  if (Array.isArray(actual)) {
    return actual.some(
      (item) =>
        typeof item === "string" && typeof expected === "string"
          ? item.toLowerCase().includes(expected.toLowerCase())
          : scalarEquals(item, expected),
    );
  }
  if (typeof actual === "string") {
    return actual.toLowerCase().includes(String(expected ?? "").toLowerCase());
  }
  return false;
}

function compareOrder(
  actual: unknown,
  expected: BasesLiteral,
): number | null {
  if (actual === undefined || actual === null) return null;

  const left = toComparableNumber(actual);
  const right = toComparableNumber(expected);
  if (left !== null && right !== null) {
    return Math.sign(left - right);
  }

  if (actual instanceof Date) return null;
  return Math.sign(String(actual).localeCompare(String(expected ?? ""), "en"));
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    const time = Date.parse(trimmed);
    if (!Number.isNaN(time)) return time;
  }
  return null;
}
