import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import type {
  DataviewComparisonOperator,
  DataviewExpression,
  DataviewFrom,
  DataviewSort,
  DataviewSource,
  DataviewSpec,
} from "./types.js";

export type DataviewScope = {
  entry: ContentManifestEntry;
  manifest: ContentManifest;
};

export type DataviewGroup = {
  key: string;
  entries: ContentManifestEntry[];
};

export type DataviewSelection = {
  entries: ContentManifestEntry[];
  groups: DataviewGroup[];
  grouped: boolean;
};

export class DataviewEvaluationError extends Error {}

/**
 * Select the manifest entries a spec matches, applying `FROM`, `WHERE`, `SORT`,
 * `LIMIT`, and `GROUP BY` in that order.
 */
export function selectDataviewEntries(
  spec: DataviewSpec,
  manifest: ContentManifest,
  defaultLimit: number | null,
): DataviewSelection {
  let entries = manifest.entries.filter((entry) =>
    matchesDataviewFrom(spec.from, entry, manifest),
  );

  if (spec.where) {
    entries = entries.filter((entry) =>
      isTruthy(
        evaluateDataviewExpression(spec.where as DataviewExpression, {
          entry,
          manifest,
        }),
      ),
    );
  }

  if (spec.sort.length > 0) {
    entries = sortEntries(entries, spec.sort, manifest);
  }

  const limit = spec.limit ?? defaultLimit;
  if (limit !== null) entries = entries.slice(0, limit);

  if (spec.groupBy) {
    return {
      entries,
      groups: groupEntries(entries, spec.groupBy, manifest),
      grouped: true,
    };
  }

  return { entries, groups: [], grouped: false };
}

export function matchesDataviewFrom(
  from: DataviewFrom | null,
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): boolean {
  if (!from) return true;

  switch (from.kind) {
    case "source":
      return matchesSource(from.source, entry, manifest);
    case "not":
      return !matchesDataviewFrom(from.child, entry, manifest);
    case "and":
      return (
        matchesDataviewFrom(from.left, entry, manifest) &&
        matchesDataviewFrom(from.right, entry, manifest)
      );
    case "or":
      return (
        matchesDataviewFrom(from.left, entry, manifest) ||
        matchesDataviewFrom(from.right, entry, manifest)
      );
    default:
      return true;
  }
}

function matchesSource(
  source: DataviewSource,
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): boolean {
  switch (source.kind) {
    case "tag": {
      const wanted = stripHash(source.value).toLowerCase();
      return entry.tags.some((tag) => tag.toLowerCase() === wanted);
    }
    case "folder": {
      const folder = normalizeFolder(source.value);
      if (folder.length === 0) return true;
      return entry.slug === folder || entry.slug.startsWith(`${folder}/`);
    }
    case "link": {
      const target = manifest.contentIndex.get(source.value.toLowerCase());
      if (!target) return false;
      const sources = manifest.incomingLinks.get(target) ?? [];
      return sources.includes(entry.slug);
    }
    default:
      return false;
  }
}

export function evaluateDataviewExpression(
  expression: DataviewExpression,
  scope: DataviewScope,
): unknown {
  switch (expression.kind) {
    case "literal":
      return expression.value;
    case "field":
      return readDataviewField(scope.entry, expression.path, scope.manifest);
    case "not":
      return !isTruthy(evaluateDataviewExpression(expression.operand, scope));
    case "and":
      return (
        isTruthy(evaluateDataviewExpression(expression.left, scope)) &&
        isTruthy(evaluateDataviewExpression(expression.right, scope))
      );
    case "or":
      return (
        isTruthy(evaluateDataviewExpression(expression.left, scope)) ||
        isTruthy(evaluateDataviewExpression(expression.right, scope))
      );
    case "compare":
      return compareValues(
        expression.operator,
        evaluateDataviewExpression(expression.left, scope),
        evaluateDataviewExpression(expression.right, scope),
      );
    case "call":
      return callFunction(expression, scope);
    default:
      return undefined;
  }
}

function callFunction(
  expression: Extract<DataviewExpression, { kind: "call" }>,
  scope: DataviewScope,
): unknown {
  const args = expression.args.map((arg) =>
    evaluateDataviewExpression(arg, scope),
  );

  switch (expression.name) {
    case "contains":
      return containsValue(args[0], args[1]);
    case "date":
      return toDataviewTime(args[0]);
    case "number": {
      const numeric = toNumber(args[0]);
      return numeric === null ? null : numeric;
    }
    case "string":
      return args[0] === undefined || args[0] === null ? null : String(args[0]);
    default:
      throw new DataviewEvaluationError(
        `unsupported function \`${expression.name}()\` in WHERE.`,
      );
  }
}

export function readDataviewField(
  entry: ContentManifestEntry,
  path: readonly string[],
  _manifest?: ContentManifest,
): unknown {
  if (path.length === 0) return undefined;
  const [head, ...rest] = path;
  if (head === "file") return readFileField(entry, rest);
  if (rest.length === 0 && (head === "title" || head === "tags")) {
    if (head === "title") return entry.title;
    return entry.tags;
  }
  return readNested(entry.frontmatter, path);
}

function readFileField(
  entry: ContentManifestEntry,
  path: readonly string[],
): unknown {
  const field = path[0];
  if (!field) return undefined;

  switch (field) {
    case "name":
    case "title":
      return entry.title;
    case "slug":
    case "path":
      return entry.slug;
    case "folder":
      return folderOf(entry.slug);
    case "link":
    case "permalink":
    case "url":
      return entry.permalink;
    case "tags":
      return entry.tags;
    case "date":
      return (
        entry.frontmatter.date ??
        entry.frontmatter.created ??
        entry.frontmatter.published ??
        entry.frontmatter.updated
      );
    case "created":
      return entry.frontmatter.created;
    case "updated":
      return entry.frontmatter.updated;
    case "published":
      return entry.frontmatter.published;
    default:
      return undefined;
  }
}

function readNested(
  value: Record<string, unknown>,
  path: readonly string[],
): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return Number.isFinite(value.getTime());
  return true;
}

function compareValues(
  operator: DataviewComparisonOperator,
  left: unknown,
  right: unknown,
): boolean {
  if (operator === "=") return looseEquals(left, right);
  if (operator === "!=") return !looseEquals(left, right);

  const order = compareOrder(left, right);
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
  }
}

function looseEquals(left: unknown, right: unknown): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    return (left ?? null) === (right ?? null);
  }

  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;

  if (typeof leftValue === "boolean" || typeof rightValue === "boolean") {
    return leftValue === rightValue;
  }
  const leftNumber = toNumber(leftValue);
  const rightNumber = toNumber(rightValue);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber === rightNumber;
  }
  return String(leftValue).toLowerCase() === String(rightValue).toLowerCase();
}

function compareOrder(left: unknown, right: unknown): number | null {
  const leftValue = normalizeComparable(left);
  const rightValue = normalizeComparable(right);
  if (leftValue === null || rightValue === null) return null;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  const leftText = String(leftValue).toLowerCase();
  const rightText = String(rightValue).toLowerCase();
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

function normalizeComparable(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return value;
  }
  return String(value);
}

function containsValue(container: unknown, expected: unknown): boolean {
  if (container === null || container === undefined) return false;

  if (Array.isArray(container)) {
    return container.some((item) => looseTagEquals(item, expected));
  }
  if (typeof container === "string") {
    if (expected === null || expected === undefined) return false;
    return container.toLowerCase().includes(String(expected).toLowerCase());
  }
  return false;
}

function looseTagEquals(left: unknown, right: unknown): boolean {
  if (typeof left === "string" && typeof right === "string") {
    return stripHash(left).toLowerCase() === stripHash(right).toLowerCase();
  }
  return looseEquals(left, right);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Parse a value into a millisecond timestamp, or `null` when impossible. */
export function toDataviewTime(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function sortEntries(
  entries: ContentManifestEntry[],
  sort: readonly DataviewSort[],
  manifest: ContentManifest,
): ContentManifestEntry[] {
  return [...entries].sort((left, right) => {
    for (const key of sort) {
      const path = key.field.split(".");
      const leftValue = readDataviewField(left, path, manifest);
      const rightValue = readDataviewField(right, path, manifest);

      if (leftValue === undefined && rightValue === undefined) continue;
      if (leftValue === undefined) return 1;
      if (rightValue === undefined) return -1;

      const order = compareOrder(leftValue, rightValue);
      if (order === null) continue;
      if (order !== 0) return key.order === "desc" ? -order : order;
    }
    return 0;
  });
}

function groupEntries(
  entries: readonly ContentManifestEntry[],
  field: string,
  manifest: ContentManifest,
): DataviewGroup[] {
  const groups = new Map<string, ContentManifestEntry[]>();
  const path = field.split(".");

  for (const entry of entries) {
    const key = formatGroupKey(readDataviewField(entry, path, manifest));
    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([key, bucket]) => ({
    key,
    entries: bucket,
  }));
}

function formatGroupKey(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? value.toISOString().slice(0, 10)
      : "(none)";
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
}

function stripHash(value: string): string {
  return value.startsWith("#") ? value.slice(1) : value;
}

function normalizeFolder(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function folderOf(slug: string): string {
  const index = slug.lastIndexOf("/");
  return index < 0 ? "" : slug.slice(0, index);
}
