import type { ContentManifestEntry } from "@riebeckite/core";
import { evaluateBasesExpression, resolveValueRef } from "./evaluate.js";
import { parseValueRef } from "./parse.js";
import type { BasesGroupKey, BasesSpec, BasesView } from "./types.js";

export type BasesGroup = {
  readonly key: BasesGroupKey;
  readonly entries: readonly ContentManifestEntry[];
};

export function resolveBasesProperty(
  entry: ContentManifestEntry,
  property: string,
  spec: BasesSpec,
): unknown {
  if (property.toLowerCase().startsWith("formula.")) {
    const expression = spec.formulas[property.slice("formula.".length)];
    return expression
      ? evaluateBasesExpression(expression, entry, spec.formulas)
      : undefined;
  }
  return resolveValueRef(parseValueRef(property), entry);
}

export function sortBasesEntries(
  entries: readonly ContentManifestEntry[],
  view: BasesView,
  spec: BasesSpec,
): ContentManifestEntry[] {
  const indexed = entries.map((entry, index) => ({ entry, index }));
  return indexed
    .sort((left, right) => {
      for (const sort of view.sort ?? []) {
        const result = compareValues(
          resolveBasesProperty(left.entry, sort.property, spec),
          resolveBasesProperty(right.entry, sort.property, spec),
        );
        if (result !== 0) return sort.direction === "desc" ? -result : result;
      }
      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

export function groupBasesEntries(
  entries: readonly ContentManifestEntry[],
  view: BasesView,
  spec: BasesSpec,
): readonly BasesGroup[] {
  if (!view.groupBy) return [{ key: null, entries }];
  const groups = new Map<
    string,
    { key: BasesGroupKey; entries: ContentManifestEntry[] }
  >();
  for (const entry of entries) {
    const value = resolveBasesProperty(entry, view.groupBy.property, spec);
    for (const key of groupKeys(value)) {
      const identity = groupIdentity(key);
      const group = groups.get(identity);
      if (group) group.entries.push(entry);
      else groups.set(identity, { key, entries: [entry] });
    }
  }
  const all = [...groups.values()];
  const ordered = view.groupOrder
    ? view.groupOrder
        .map((key) => groups.get(groupIdentity(key)))
        .filter(
          (
            group,
          ): group is { key: BasesGroupKey; entries: ContentManifestEntry[] } =>
            Boolean(group),
        )
    : all.sort((left, right) => {
        const result = compareValues(left.key, right.key);
        return view.groupBy?.direction === "desc" ? -result : result;
      });
  return ordered.map((group) => ({ key: group.key, entries: group.entries }));
}

export function summarizeBasesValues(
  values: readonly unknown[],
  name: string,
  spec: BasesSpec,
): unknown {
  const custom = spec.summaries[name];
  if (custom) {
    const entry = emptyEntry;
    return evaluateBasesExpression(custom, entry, spec.formulas, { values });
  }
  const normalized = name.trim().toLowerCase();
  const present = values.filter((value) => !isEmpty(value));
  const numbers = present.filter(isFiniteNumber);
  const dates = present
    .map(toDate)
    .filter((value): value is Date => value !== null);
  if (normalized === "empty") return values.length - present.length;
  if (normalized === "filled") return present.length;
  if (normalized === "unique") return new Set(present.map(valueIdentity)).size;
  if (normalized === "checked")
    return present.filter((value) => value === true).length;
  if (normalized === "unchecked")
    return present.filter((value) => value === false).length;
  if (normalized === "earliest")
    return dates.length
      ? new Date(Math.min(...dates.map((value) => value.getTime())))
      : null;
  if (normalized === "latest")
    return dates.length
      ? new Date(Math.max(...dates.map((value) => value.getTime())))
      : null;
  if (normalized === "range" && dates.length)
    return (
      Math.max(...dates.map((value) => value.getTime())) -
      Math.min(...dates.map((value) => value.getTime()))
    );
  if (!numbers.length) return null;
  if (normalized === "sum")
    return numbers.reduce((sum, value) => sum + value, 0);
  if (normalized === "average")
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (normalized === "min") return Math.min(...numbers);
  if (normalized === "max") return Math.max(...numbers);
  if (normalized === "range")
    return Math.max(...numbers) - Math.min(...numbers);
  if (normalized === "median") {
    const ordered = [...numbers].sort((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2
      ? ordered[middle]
      : ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
  }
  if (normalized === "stddev") {
    const mean =
      numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    return Math.sqrt(
      numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        numbers.length,
    );
  }
  return null;
}

function groupKeys(value: unknown): readonly BasesGroupKey[] {
  if (Array.isArray(value))
    return value.length ? value.flatMap(groupKeys) : [null];
  return isGroupKey(value) ? [value] : [null];
}

function isGroupKey(value: unknown): value is BasesGroupKey {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function compareValues(left: unknown, right: unknown): number {
  const leftEmpty = isEmpty(left);
  const rightEmpty = isEmpty(right);
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (leftDate && rightDate) return leftDate.getTime() - rightDate.getTime();
  if (typeof left === "number" && typeof right === "number")
    return left - right;
  if (typeof left === "boolean" && typeof right === "boolean")
    return Number(left) - Number(right);
  const typeOrder = valueTypeOrder(left) - valueTypeOrder(right);
  if (typeOrder !== 0) return typeOrder;
  return String(left).localeCompare(String(right), "en");
}

function valueTypeOrder(value: unknown): number {
  if (typeof value === "number") return 0;
  if (toDate(value)) return 1;
  if (typeof value === "boolean") return 2;
  return 3;
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:T|\s|$)/.test(value.trim())
  )
    return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

function valueIdentity(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`;
  return `${typeof value}:${String(value)}`;
}

function groupIdentity(value: BasesGroupKey): string {
  return value === null ? "null" : `${typeof value}:${String(value)}`;
}

const emptyEntry = {
  slug: "",
  permalink: "",
  title: "",
  tags: [],
  links: [],
  frontmatter: {},
} as unknown as ContentManifestEntry;
