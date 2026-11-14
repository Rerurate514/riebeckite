import type { ContentManifest } from "@riebeckite/core";
import { evaluateDataviewExpression } from "./evaluate_expression.js";
import { compareOrder } from "./evaluate_logic.js";
import type { DataviewRow, DataviewScope } from "./evaluate_types.js";
import type { DataviewExpression, DataviewSort } from "./types.js";

export function sortRows(
  rows: DataviewRow[],
  sort: readonly DataviewSort[],
  manifest: ContentManifest,
  buildTime: Date | undefined,
): DataviewRow[] {
  return [...rows].sort((left, right) => {
    for (const key of sort) {
      const expression: DataviewExpression = key.expression ?? {
        kind: "field",
        path: key.field.split("."),
      };
      const leftValue = evaluateDataviewExpression(
        expression,
        scopeOf(left, manifest, buildTime),
      );
      const rightValue = evaluateDataviewExpression(
        expression,
        scopeOf(right, manifest, buildTime),
      );

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

export function scopeOf(
  row: DataviewRow,
  manifest: ContentManifest,
  buildTime: Date | undefined,
): DataviewScope {
  return {
    entry: row.entry,
    manifest,
    fields: row.fields,
    task: row.task,
    buildTime,
  };
}
