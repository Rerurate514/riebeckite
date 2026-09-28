export type DataviewQueryType = "list" | "table" | "task" | "calendar";

export type DataviewSortOrder = "asc" | "desc";

export type DataviewSort = {
  field: string;
  order: DataviewSortOrder;
};

export type DataviewColumn = {
  field: string;
  label?: string;
};

export type DataviewComparisonOperator = "=" | "!=" | ">" | "<" | ">=" | "<=";

export type DataviewSource =
  | { kind: "tag"; value: string }
  | { kind: "folder"; value: string }
  | { kind: "link"; value: string };

export type DataviewFrom =
  | { kind: "source"; source: DataviewSource }
  | { kind: "not"; child: DataviewFrom }
  | { kind: "and"; left: DataviewFrom; right: DataviewFrom }
  | { kind: "or"; left: DataviewFrom; right: DataviewFrom };

export type DataviewExpression =
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "field"; path: readonly string[] }
  | { kind: "not"; operand: DataviewExpression }
  | { kind: "and"; left: DataviewExpression; right: DataviewExpression }
  | { kind: "or"; left: DataviewExpression; right: DataviewExpression }
  | {
      kind: "compare";
      operator: DataviewComparisonOperator;
      left: DataviewExpression;
      right: DataviewExpression;
    }
  | { kind: "call"; name: string; args: readonly DataviewExpression[] };

export type DataviewSpec = {
  type: DataviewQueryType;
  columns: readonly DataviewColumn[];
  expression: string | null;
  from: DataviewFrom | null;
  where: DataviewExpression | null;
  sort: readonly DataviewSort[];
  groupBy: string | null;
  limit: number | null;
};

export type DataviewParseResult =
  | { status: "ok"; spec: DataviewSpec }
  | { status: "error"; message: string };

export type DataviewOptions = {
  className?: string;
  language?: string;
  hideFallback?: boolean;
  limit?: number;
};

export type ResolvedDataviewOptions = {
  className: string;
  language: string;
  hideFallback: boolean;
  limit: number | null;
};

export const DEFAULT_DATAVIEW_CLASS_NAME = "rb-dataview";
export const DEFAULT_DATAVIEW_LANGUAGE = "dataview";

export function resolveDataviewOptions(
  options: DataviewOptions = {},
): ResolvedDataviewOptions {
  const className = options.className?.trim();
  const language = options.language?.trim();
  const limit = options.limit;

  return {
    className: className ? className : DEFAULT_DATAVIEW_CLASS_NAME,
    language: language ? language : DEFAULT_DATAVIEW_LANGUAGE,
    hideFallback: options.hideFallback === true,
    limit:
      typeof limit === "number" && Number.isFinite(limit) && limit >= 0
        ? Math.floor(limit)
        : null,
  };
}
