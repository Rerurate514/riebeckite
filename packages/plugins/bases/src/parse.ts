import type { ContentQuerySort } from "@riebeckite/core";
import type {
  BasesBuiltinValue,
  BasesCondition,
  BasesLiteral,
  BasesOperator,
  BasesSpec,
  BasesValueRef,
  BasesView,
  BasesViewType,
} from "./types.js";

/** Columns used when neither the Base nor the view configures any. */
export const DEFAULT_COLUMNS = ["file.name", "file.tags"] as const;

type Result<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly message: string;
    };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (message: string): Result<never> => ({ ok: false, message });

const BUILTIN_ALIASES: Record<string, BasesBuiltinValue | "date"> = {
  "file.name": "file.name",
  "file.path": "file.path",
  "file.slug": "file.slug",
  "file.folder": "file.folder",
  "file.title": "file.title",
  "file.link": "file.link",
  "file.permalink": "file.permalink",
  "file.url": "file.link",
  "file.tags": "file.tags",
  "file.mtime": "date",
  "file.ctime": "date",
  "file.date": "date",
};

/**
 * Compiles a parsed YAML Base document into the serializable spec the renderer
 * consumes. Returns a diagnostic message when the document uses a shape the
 * MVP cannot understand; the caller keeps the original code block in that case.
 */
export function parseBases(document: unknown): Result<BasesSpec> {
  if (document === null || document === undefined) {
    return ok({ properties: {}, views: [] });
  }
  if (typeof document !== "object" || Array.isArray(document)) {
    return fail("Base definition must be a YAML mapping.");
  }
  const root = document as Record<string, unknown>;

  const filter = parseFilters(root.filters, "filters");
  if (filter.ok === false) return filter;

  const properties = parseProperties(root.properties);
  if (properties.ok === false) return properties;

  const views = parseViews(root.views, properties.value);
  if (views.ok === false) return views;

  return ok({
    ...(filter.value === undefined ? {} : { filter: filter.value }),
    properties: properties.value,
    views: views.value,
  });
}

// --- filters ---------------------------------------------------------------

function parseFilters(
  value: unknown,
  path: string,
): Result<BasesCondition | undefined> {
  if (value === undefined || value === null) return ok(undefined);

  if (typeof value === "string") {
    const text = value.trim();
    return text === "" ? ok(undefined) : parseExpression(text, path);
  }

  if (Array.isArray(value)) {
    return combineAnd(value, path);
  }

  if (typeof value === "object") {
    return parseFilterObject(value as Record<string, unknown>, path);
  }

  return fail(`${path} must be an expression, a list, or a filter object.`);
}

function parseFilterObject(
  object: Record<string, unknown>,
  path: string,
): Result<BasesCondition | undefined> {
  const children: BasesCondition[] = [];

  if ("and" in object || "or" in object || "not" in object) {
    if ("and" in object) {
      const parsed = combineAnd(toList(object.and), `${path}.and`);
      if (parsed.ok === false) return parsed;
      if (parsed.value) children.push(parsed.value);
    }
    if ("or" in object) {
      const parsed = combineOr(toList(object.or), `${path}.or`);
      if (parsed.ok === false) return parsed;
      if (parsed.value) children.push(parsed.value);
    }
    if ("not" in object) {
      const parsed = combineAnd(toList(object.not), `${path}.not`);
      if (parsed.ok === false) return parsed;
      if (parsed.value) {
        children.push({ kind: "not", condition: parsed.value });
      }
    }
    return combineAndNodes(children);
  }

  // A plain mapping is treated as `property == value` equality.
  for (const [key, raw] of Object.entries(object)) {
    const parsed = propertyEquality(key, raw, `${path}.${key}`);
    if (parsed.ok === false) return parsed;
    children.push(parsed.value);
  }
  return combineAndNodes(children);
}

function propertyEquality(
  key: string,
  value: unknown,
  path: string,
): Result<BasesCondition> {
  const ref = parseValueRef(key);
  if (Array.isArray(value)) {
    const conditions = value.map((item) => ({
      kind: "compare" as const,
      left: ref,
      operator: "==" as const,
      right: scalarLiteral(item),
    }));
    return conditions.length === 0
      ? fail(`${path} must not be an empty list.`)
      : ok({ kind: "or", conditions });
  }
  return ok({
    kind: "compare",
    left: ref,
    operator: "==",
    right: scalarLiteral(value),
  });
}

function combineAnd(
  values: readonly unknown[],
  path: string,
): Result<BasesCondition | undefined> {
  const children: BasesCondition[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const parsed = parseFilters(values[index], `${path}[${index}]`);
    if (parsed.ok === false) return parsed;
    if (parsed.value) children.push(parsed.value);
  }
  return combineAndNodes(children);
}

function combineOr(
  values: readonly unknown[],
  path: string,
): Result<BasesCondition | undefined> {
  const children: BasesCondition[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const parsed = parseFilters(values[index], `${path}[${index}]`);
    if (parsed.ok === false) return parsed;
    if (parsed.value) children.push(parsed.value);
  }
  if (children.length === 0) return ok(undefined);
  if (children.length === 1) return ok(children[0]);
  return ok({ kind: "or", conditions: children });
}

function combineAndNodes(
  children: readonly BasesCondition[],
): Result<BasesCondition | undefined> {
  if (children.length === 0) return ok(undefined);
  if (children.length === 1) return ok(children[0]);
  return ok({ kind: "and", conditions: [...children] });
}

function toList(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseExpression(raw: string, path: string): Result<BasesCondition> {
  let text = raw.trim();
  while (
    text.startsWith("(") &&
    text.endsWith(")") &&
    isBalanced(text.slice(1, -1))
  ) {
    text = text.slice(1, -1).trim();
  }
  if (text === "") return fail(`${path} contains an empty filter expression.`);

  const call = text.match(/^(?:file|note)\.(\w+)\s*\(\s*(.*?)\s*\)$/i);
  if (call) {
    const name = call[1].toLowerCase();
    const argument = stripQuotes(call[2]);
    if (argument === "") {
      return fail(`${path} has a ${name}() call without an argument.`);
    }
    if (name === "hastag") return ok({ kind: "hasTag", tag: argument });
    if (name === "infolder") return ok({ kind: "inFolder", folder: argument });
    if (name === "haslink") return ok({ kind: "hasLink", link: argument });
    return fail(`${path} uses an unsupported function \`${name}()\`.`);
  }

  if (/^[a-z_][\w.]*\s*\(/i.test(text)) {
    return fail(`${path} uses an unsupported function in \`${text}\`.`);
  }

  const contains = text.match(/^(.+?)\s+contains\s+(.+)$/i);
  if (contains) {
    return comparisonFrom(contains[1], "contains", contains[2], path);
  }

  const comparison = text.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparison) {
    return comparisonFrom(
      comparison[1],
      comparison[2] as BasesOperator,
      comparison[3],
      path,
    );
  }

  return fail(`${path} uses an unsupported filter expression \`${raw}\`.`);
}

function comparisonFrom(
  left: string,
  operator: BasesOperator,
  right: string,
  path: string,
): Result<BasesCondition> {
  const reference = left.trim();
  if (reference === "") {
    return fail(`${path} is missing a left-hand side for \`${operator}\`.`);
  }
  return ok({
    kind: "compare",
    left: parseValueRef(reference),
    operator,
    right: parseLiteral(right),
  });
}

/** Maps a property id (e.g. `file.name`, `note.status`, `draft`) to its ref. */
export function parseValueRef(raw: string): BasesValueRef {
  const key = stripQuotes(raw.trim());
  const lower = key.toLowerCase();

  const alias = BUILTIN_ALIASES[lower];
  if (alias !== undefined) {
    if (alias === "date") return { source: "frontmatter", key: "date" };
    return { source: "builtin", name: alias };
  }

  if (lower.startsWith("note.")) {
    return { source: "frontmatter", key: key.slice("note.".length) };
  }
  if (lower.startsWith("file.frontmatter.")) {
    return {
      source: "frontmatter",
      key: key.slice("file.frontmatter.".length),
    };
  }
  if (lower.startsWith("file.")) {
    return { source: "frontmatter", key: key.slice("file.".length) };
  }
  return { source: "frontmatter", key };
}

function parseLiteral(raw: string): BasesLiteral {
  const text = raw.trim();
  if (isQuoted(text)) return stripQuotes(text);
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function scalarLiteral(value: unknown): BasesLiteral {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function isQuoted(value: string): boolean {
  if (value.length < 2) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}

function stripQuotes(value: string): string {
  const text = value.trim();
  return isQuoted(text) ? text.slice(1, -1) : text;
}

function isBalanced(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

// --- properties ------------------------------------------------------------

function parseProperties(value: unknown): Result<Record<string, string>> {
  if (value === undefined || value === null) return ok({});
  if (typeof value !== "object" || Array.isArray(value)) {
    return fail("`properties` must be a YAML mapping.");
  }

  const labels: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    labels[key] = propertyLabel(key, raw);
  }
  return ok(labels);
}

function propertyLabel(key: string, raw: unknown): string {
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const displayName = (raw as Record<string, unknown>).displayName;
    if (typeof displayName === "string" && displayName.trim() !== "") {
      return displayName;
    }
  }
  return key;
}

// --- views -----------------------------------------------------------------

function parseViews(
  value: unknown,
  properties: Readonly<Record<string, string>>,
): Result<BasesView[]> {
  if (value === undefined || value === null) return ok([]);
  if (!Array.isArray(value)) return fail("`views` must be a list.");

  const views: BasesView[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const parsed = parseView(value[index], properties, `views[${index}]`);
    if (parsed.ok === false) return parsed;
    views.push(parsed.value);
  }
  return ok(views);
}

function parseView(
  value: unknown,
  properties: Readonly<Record<string, string>>,
  path: string,
): Result<BasesView> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${path} must be a mapping.`);
  }
  const object = value as Record<string, unknown>;

  const type = parseViewType(object.type, path);
  if (type.ok === false) return type;

  const filter = parseFilters(object.filters, `${path}.filters`);
  if (filter.ok === false) return filter;

  const columns = parseColumns(object, properties);
  const sort = parseSort(object.sort, `${path}.sort`);
  if (sort.ok === false) return sort;

  const limit = parseLimit(object.limit, `${path}.limit`);
  if (limit.ok === false) return limit;

  const name =
    typeof object.name === "string" && object.name.trim() !== ""
      ? object.name
      : undefined;

  return ok({
    type: type.value,
    ...(name === undefined ? {} : { name }),
    columns,
    ...(filter.value === undefined ? {} : { filter: filter.value }),
    ...(sort.value === undefined ? {} : { sort: sort.value }),
    ...(limit.value === undefined ? {} : { limit: limit.value }),
  });
}

function parseViewType(value: unknown, path: string): Result<BasesViewType> {
  if (value === undefined || value === null) return ok("table");
  const text = String(value).trim().toLowerCase();
  if (text === "table" || text === "cards") return ok(text);
  return fail(`${path}.type must be "table" or "cards".`);
}

function parseColumns(
  object: Record<string, unknown>,
  properties: Readonly<Record<string, string>>,
): readonly string[] {
  const configured =
    readStringList(object.order) ?? readStringList(object.columns);
  if (configured && configured.length > 0) return configured;
  const fromProperties = Object.keys(properties);
  if (fromProperties.length > 0) return fromProperties;
  return [...DEFAULT_COLUMNS];
}

function readStringList(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  const list = Array.isArray(value) ? value : [value];
  const out = list
    .filter((item): item is string | number => {
      return typeof item === "string" || typeof item === "number";
    })
    .map((item) => String(item).trim())
    .filter((item) => item !== "");
  return out;
}

function parseSort(
  value: unknown,
  path: string,
): Result<ContentQuerySort[] | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  const list = Array.isArray(value) ? value : [value];
  const sorts: ContentQuerySort[] = [];

  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    if (typeof entry === "string") {
      const text = entry.trim();
      if (text === "") continue;
      const descending = text.startsWith("-");
      sorts.push({
        field: mapSortField(descending ? text.slice(1) : text),
        order: descending ? "desc" : "asc",
      });
      continue;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      const property = record.property ?? record.field;
      if (typeof property !== "string" || property.trim() === "") {
        return fail(`${path}[${index}] must name a \`property\` or \`field\`.`);
      }
      const direction = record.direction ?? record.order;
      const descending =
        typeof direction === "string" &&
        direction.trim().toLowerCase() === "desc";
      sorts.push({
        field: mapSortField(property),
        order: descending ? "desc" : "asc",
      });
      continue;
    }
    return fail(`${path}[${index}] must be a property name or a mapping.`);
  }

  return ok(sorts.length === 0 ? undefined : sorts);
}

function mapSortField(property: string): string {
  const ref = parseValueRef(property);
  if (ref.source === "frontmatter") return ref.key;
  switch (ref.name) {
    case "file.name":
    case "file.title":
      return "title";
    case "file.path":
    case "file.slug":
      return "slug";
    case "file.link":
    case "file.permalink":
      return "permalink";
    case "file.tags":
      return "tags";
    case "file.folder":
      return "slug";
    default:
      return property;
  }
}

function parseLimit(value: unknown, path: string): Result<number | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fail(`${path} must be a non-negative number.`);
  }
  return ok(Math.floor(value));
}
