import { parseFilters } from "./bases_parse_filters.js";
import type { Result } from "./bases_parse_shared.js";
import { DEFAULT_COLUMNS, fail, ok } from "./bases_parse_shared.js";
import type {
  BasesGroupBy,
  BasesGroupKey,
  BasesSort,
  BasesView,
  BasesViewType,
} from "./types.js";

export function parseViews(
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

export function parseView(
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

  const groupBy = parseGroupBy(object.groupBy, `${path}.groupBy`);
  if (groupBy.ok === false) return groupBy;
  const groupOrder = parseGroupOrder(object.groupOrder, `${path}.groupOrder`);
  if (groupOrder.ok === false) return groupOrder;
  const summaries = parseViewSummaries(object.summaries, `${path}.summaries`);
  if (summaries.ok === false) return summaries;

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
    ...(groupBy.value === undefined ? {} : { groupBy: groupBy.value }),
    ...(groupOrder.value === undefined ? {} : { groupOrder: groupOrder.value }),
    ...(summaries.value === undefined ? {} : { summaries: summaries.value }),
    ...(limit.value === undefined ? {} : { limit: limit.value }),
  });
}

export function parseViewType(
  value: unknown,
  path: string,
): Result<BasesViewType> {
  if (value === undefined || value === null) return ok("table");
  const text = String(value).trim().toLowerCase();
  if (
    text === "table" ||
    text === "cards" ||
    text === "list" ||
    text === "map" ||
    text === "kanban"
  )
    return ok(text);
  return fail(
    `${path}.type must be "table", "cards", "list", "map", or "kanban".`,
  );
}

export function parseColumns(
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

export function readStringList(value: unknown): string[] | null {
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

export function parseSort(
  value: unknown,
  path: string,
): Result<BasesSort[] | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  const list = Array.isArray(value) ? value : [value];
  const sorts: BasesSort[] = [];

  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    if (typeof entry === "string") {
      const text = entry.trim();
      if (text === "") continue;
      const descending = text.startsWith("-");
      sorts.push({
        property: descending ? text.slice(1) : text,
        direction: descending ? "desc" : "asc",
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
      const normalizedDirection =
        direction === undefined
          ? "asc"
          : typeof direction === "string"
            ? direction.trim().toLowerCase()
            : "";
      if (normalizedDirection !== "asc" && normalizedDirection !== "desc") {
        return fail(`${path}[${index}].direction must be "ASC" or "DESC".`);
      }
      sorts.push({
        property,
        direction: normalizedDirection,
      });
      continue;
    }
    return fail(`${path}[${index}] must be a property name or a mapping.`);
  }

  return ok(sorts.length === 0 ? undefined : sorts);
}

export function parseGroupBy(
  value: unknown,
  path: string,
): Result<BasesGroupBy | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${path} must be a mapping.`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.property !== "string" || record.property.trim() === "") {
    return fail(`${path}.property must be a non-empty property name.`);
  }
  const direction = String(record.direction ?? "asc")
    .trim()
    .toLowerCase();
  if (direction !== "asc" && direction !== "desc") {
    return fail(`${path}.direction must be "ASC" or "DESC".`);
  }
  return ok({ property: record.property, direction });
}

export function parseGroupOrder(
  value: unknown,
  path: string,
): Result<readonly BasesGroupKey[] | undefined> {
  if (value === undefined) return ok(undefined);
  if (!Array.isArray(value)) return fail(`${path} must be a list.`);
  const values: BasesGroupKey[] = [];
  for (const item of value) {
    if (
      item === null ||
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    ) {
      values.push(item);
    } else {
      return fail(
        `${path} values must be strings, numbers, booleans, or null.`,
      );
    }
  }
  return ok(values);
}

export function parseViewSummaries(
  value: unknown,
  path: string,
): Result<Record<string, string> | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${path} must be a mapping.`);
  }
  const summaries: Record<string, string> = {};
  for (const [property, summary] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof summary !== "string" || summary.trim() === "") {
      return fail(`${path}.${property} must name a summary.`);
    }
    summaries[property] = summary;
  }
  return ok(summaries);
}

export function parseLimit(
  value: unknown,
  path: string,
): Result<number | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fail(`${path} must be a non-negative number.`);
  }
  return ok(Math.floor(value));
}
