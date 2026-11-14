import crypto from "node:crypto";
import type { JsonValue } from "../plugin/plugin_cache.js";
import type { ContentManifestEntry } from "../types/content_manifest.js";
import type {
  CachedDependency,
  CacheEntry,
  DerivedContentQuery,
  DerivedDependency,
  DerivedView,
} from "./derived_view_types.js";

export function normalizeDependency(
  dependency: DerivedDependency,
): DerivedDependency {
  return {
    ...dependency,
    id: dependency.id.replace(/\\/g, "/"),
  };
}

export function toCachedDependency(
  dependency: DerivedDependency,
): CachedDependency {
  return {
    type: dependency.type,
    id: dependency.id,
    fingerprint: dependency.fingerprint || "",
    ...(dependency.property === undefined
      ? {}
      : { property: dependency.property }),
    ...(dependency.query === undefined ? {} : { query: dependency.query }),
  };
}

export function dependencyKey(dependency: DerivedDependency): string {
  return JSON.stringify({
    type: dependency.type,
    id: dependency.id,
    fingerprint: dependency.fingerprint,
    property: dependency.property,
    query: dependency.query,
  });
}

export function viewIdsFor(
  id: string,
  dependencies: readonly DerivedDependency[],
): readonly string[] {
  return [
    ...new Set([
      id,
      ...dependencies
        .filter((dependency) => dependency.type === "view")
        .map((dependency) => dependency.id),
    ]),
  ].sort();
}

export function isCacheEntry(
  value: unknown,
  view: DerivedView<unknown, unknown>,
  input: string,
): value is CacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<CacheEntry>;
  return (
    entry.version === view.version &&
    entry.input === input &&
    isJsonValue(entry.value) &&
    Array.isArray(entry.dependencies) &&
    entry.dependencies.every(isDependency)
  );
}

export function isDependency(value: unknown): value is CachedDependency {
  if (!value || typeof value !== "object") return false;
  const dependency = value as Partial<CachedDependency>;
  return (
    (dependency.type === "content" ||
      dependency.type === "file" ||
      dependency.type === "external" ||
      dependency.type === "query" ||
      dependency.type === "frontmatter" ||
      dependency.type === "view" ||
      dependency.type === "unknown") &&
    typeof dependency.id === "string" &&
    typeof dependency.fingerprint === "string" &&
    (dependency.property === undefined ||
      typeof dependency.property === "string") &&
    (dependency.query === undefined || isContentQuery(dependency.query))
  );
}

export function isContentQuery(value: unknown): value is DerivedContentQuery {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const query = value as Partial<DerivedContentQuery>;
  if (
    query.pool !== undefined &&
    query.pool !== "discoverable" &&
    query.pool !== "routable"
  ) {
    return false;
  }
  if (
    query.filter !== undefined &&
    (typeof query.filter !== "object" || Array.isArray(query.filter))
  ) {
    return false;
  }
  if (query.sort !== undefined && !isQuerySort(query.sort)) return false;
  if (
    query.limit !== undefined &&
    (typeof query.limit !== "number" || !Number.isFinite(query.limit))
  ) {
    return false;
  }
  if (
    query.offset !== undefined &&
    (typeof query.offset !== "number" || !Number.isFinite(query.offset))
  ) {
    return false;
  }
  return true;
}

export function isQuerySort(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(isQuerySort);
  if (!value || typeof value !== "object") return false;
  const sort = value as { readonly field?: unknown; readonly order?: unknown };
  return (
    (sort.field === undefined || typeof sort.field === "string") &&
    (sort.order === undefined || sort.order === "asc" || sort.order === "desc")
  );
}

export function fingerprintQueryEntries(
  entries: readonly ContentManifestEntry[],
): string | undefined {
  try {
    return fingerprint(entries, "Derived View query result");
  } catch {
    return undefined;
  }
}

export function isCacheableDependency(
  dependency: DerivedDependency,
): dependency is DerivedDependency & { fingerprint: string } {
  return (
    dependency.type !== "unknown" && typeof dependency.fingerprint === "string"
  );
}

export function fingerprint(value: unknown, label: string): string {
  return crypto
    .createHash("sha256")
    .update(serializeInput(value, label, new Set(), true))
    .digest("hex");
}

export function serializeInput(
  value: unknown,
  label: string,
  seen: Set<object>,
  allowUndefined: boolean,
): string {
  if (value === undefined) {
    if (allowUndefined) return "undefined";
    throw new TypeError(`${label} must be JSON-serializable.`);
  }
  if (value === null) return "null";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "number" && Number.isFinite(value))
    return `number:${value}`;
  if (value instanceof Date) {
    if (Number.isNaN(value.valueOf())) {
      throw new TypeError(`${label} must contain valid dates.`);
    }
    return `date:${value.toISOString()}`;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError(`${label} must not be cyclic.`);
    seen.add(value);
    const serialized = `[${value
      .map((item) => serializeInput(item, label, seen, false))
      .join(",")}]`;
    seen.delete(value);
    return serialized;
  }
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    if (seen.has(value)) throw new TypeError(`${label} must not be cyclic.`);
    seen.add(value);
    const serialized = `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${serializeInput(
            (value as Record<string, unknown>)[key],
            label,
            seen,
            false,
          )}`,
      )
      .join(",")}}`;
    seen.delete(value);
    return serialized;
  }
  throw new TypeError(`${label} must be JSON-serializable.`);
}

export function isJsonValue(
  value: unknown,
  ancestors: Set<object> = new Set(),
): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number")
    return Number.isFinite(value) && !Object.is(value, -0);
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (hasNonJsonProperties(value)) return false;
      for (let index = 0; index < value.length; index += 1) {
        if (!isJsonValue(value[index], ancestors)) return false;
      }
      return true;
    }
    if (
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.hasOwn(value, "toJSON") ||
      hasEnumerableSymbols(value)
    )
      return false;
    return Object.values(value as Record<string, unknown>).every((item) =>
      isJsonValue(item, ancestors),
    );
  } finally {
    ancestors.delete(value);
  }
}

export function hasNonJsonProperties(value: readonly unknown[]): boolean {
  if (Object.hasOwn(value, "toJSON") || hasEnumerableSymbols(value))
    return true;
  return Object.keys(value).some((key) => {
    const index = Number(key);
    return (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= value.length ||
      String(index) !== key
    );
  });
}

export function hasEnumerableSymbols(value: object): boolean {
  return Object.getOwnPropertySymbols(value).some(
    (symbol) =>
      Object.getOwnPropertyDescriptor(value, symbol)?.enumerable === true,
  );
}
