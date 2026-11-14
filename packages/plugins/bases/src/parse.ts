import { parseFilters } from "./bases_parse_filters.js";
import type { Result } from "./bases_parse_shared.js";
import { fail, ok } from "./bases_parse_shared.js";
import { parseFormulas, parseProperties } from "./bases_parse_values.js";
import { parseViews } from "./bases_parse_views.js";
import type { BasesSpec } from "./types.js";

export { DEFAULT_COLUMNS } from "./bases_parse_shared.js";
export { parseValueRef } from "./bases_parse_values.js";

export function parseBases(document: unknown): Result<BasesSpec> {
  if (document === null || document === undefined) {
    return ok({ properties: {}, formulas: {}, summaries: {}, views: [] });
  }
  if (typeof document !== "object" || Array.isArray(document)) {
    return fail("Base definition must be a YAML mapping.");
  }
  const root = document as Record<string, unknown>;

  const filter = parseFilters(root.filters, "filters");
  if (filter.ok === false) return filter;

  const properties = parseProperties(root.properties);
  if (properties.ok === false) return properties;

  const formulas = parseFormulas(root.formulas);
  if (formulas.ok === false) return formulas;

  const summaries = parseFormulas(root.summaries);
  if (summaries.ok === false) return summaries;

  const views = parseViews(root.views, properties.value);
  if (views.ok === false) return views;

  return ok({
    ...(filter.value === undefined ? {} : { filter: filter.value }),
    properties: properties.value,
    formulas: formulas.value,
    summaries: summaries.value,
    views: views.value,
  });
}
