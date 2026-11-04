export type DataviewQueryType = "list" | "table" | "task" | "calendar";

export type DataviewSortOrder = "asc" | "desc";

export type DataviewSort = {
  field: string;
  order: DataviewSortOrder;
  expression?: DataviewExpression;
};

export type DataviewColumn = {
  field: string;
  expression?: DataviewExpression;
  label?: string;
};

export type DataviewComparisonOperator = "=" | "!=" | ">" | "<" | ">=" | "<=";

export type DataviewArithmeticOperator = "+" | "-" | "*" | "/" | "%";

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
  | { kind: "list"; items: readonly DataviewExpression[] }
  | { kind: "not"; operand: DataviewExpression }
  | { kind: "and"; left: DataviewExpression; right: DataviewExpression }
  | { kind: "or"; left: DataviewExpression; right: DataviewExpression }
  | { kind: "unary"; operator: "-"; operand: DataviewExpression }
  | {
      kind: "arithmetic";
      operator: DataviewArithmeticOperator;
      left: DataviewExpression;
      right: DataviewExpression;
    }
  | {
      kind: "compare";
      operator: DataviewComparisonOperator;
      left: DataviewExpression;
      right: DataviewExpression;
    }
  | { kind: "call"; name: string; args: readonly DataviewExpression[] };

export type DataviewCommand =
  | { kind: "from"; from: DataviewFrom }
  | { kind: "where"; expression: DataviewExpression }
  | { kind: "flatten"; expression: DataviewExpression; label?: string }
  | {
      kind: "groupBy";
      expression: DataviewExpression;
      field: string;
      label?: string;
    }
  | { kind: "sort"; sort: readonly DataviewSort[] }
  | { kind: "limit"; limit: number };

export type DataviewSpec = {
  type: DataviewQueryType;
  columns: readonly DataviewColumn[];
  expression: string | null;
  from: DataviewFrom | null;
  where: DataviewExpression | null;
  sort: readonly DataviewSort[];
  groupBy: string | null;
  limit: number | null;
  withoutId?: boolean;
  commands?: readonly DataviewCommand[];
  groupExpression?: DataviewExpression;
  groupLabel?: string;
  listExpression?: DataviewExpression;
  calendarExpression?: DataviewExpression;
};

export type DataviewParseResult =
  | { status: "ok"; spec: DataviewSpec }
  | { status: "error"; message: string };

export type DataviewOptions = {
  className?: string;
  language?: string;
  hideFallback?: boolean;
  limit?: number;
  localeMode?: "current" | "fallback" | "all";
};

export type ResolvedDataviewOptions = {
  className: string;
  language: string;
  hideFallback: boolean;
  limit: number | null;
  localeMode: "current" | "fallback" | "all";
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
    localeMode:
      options.localeMode === "all" || options.localeMode === "fallback"
        ? options.localeMode
        : "current",
  };
}
