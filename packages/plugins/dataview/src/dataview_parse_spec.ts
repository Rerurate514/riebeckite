import { parseExpression } from "./dataview_parse_expression.js";
import { parseFrom } from "./parse-from.js";
import { DataviewParseError, splitTopLevel, unquote } from "./parse-shared.js";
import type {
  DataviewColumn,
  DataviewCommand,
  DataviewExpression,
  DataviewQueryType,
  DataviewSort,
  DataviewSortOrder,
  DataviewSpec,
} from "./types.js";

export const QUERY_TYPES = new Set<DataviewQueryType>([
  "list",
  "table",
  "task",
  "calendar",
]);

export const CLAUSE_PATTERN =
  /^(from|where|sort|group\s+by|limit|flatten)\b(.*)$/i;

export function parseSpec(source: string): DataviewSpec {
  const lines = source.split(/\r?\n/);
  const firstIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstIndex < 0) {
    throw new DataviewParseError("the dataview block is empty.");
  }

  const first = lines[firstIndex].trim();
  const typeMatch = /^([A-Za-z]+)\b(.*)$/.exec(first);
  if (!typeMatch) {
    throw new DataviewParseError(
      "a dataview block must start with a query type.",
    );
  }

  const type = typeMatch[1].toLowerCase();
  if (!QUERY_TYPES.has(type as DataviewQueryType)) {
    throw new DataviewParseError(
      `unsupported query type \`${typeMatch[1]}\`; expected LIST, TABLE, TASK, or CALENDAR.`,
    );
  }

  const { headLines, clauses } = segment(lines.slice(firstIndex + 1));
  const headText = [typeMatch[2].trim(), ...headLines]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();

  let columns: DataviewColumn[] = [];
  let expression: string | null = null;
  let listExpression: DataviewExpression | undefined;
  let calendarExpression: DataviewExpression | undefined;
  let withoutId = false;

  if (type === "table") {
    const head = parseTableHead(headText);
    columns = head.columns;
    withoutId = head.withoutId;
  } else if (type === "list" || type === "calendar") {
    expression = headText.length > 0 ? headText : null;
    const parsed = expression ? parseExpression(expression) : undefined;
    if (type === "list") listExpression = parsed;
    else calendarExpression = parsed;
  } else if (headText.length > 0) {
    throw new DataviewParseError(
      "TASK does not accept a column or expression list.",
    );
  }

  const commands = clauses.map(parseCommand);

  const from = commands.find(
    (command): command is Extract<DataviewCommand, { kind: "from" }> =>
      command.kind === "from",
  );
  const where = commands.find(
    (command): command is Extract<DataviewCommand, { kind: "where" }> =>
      command.kind === "where",
  );
  const sort = commands.find(
    (command): command is Extract<DataviewCommand, { kind: "sort" }> =>
      command.kind === "sort",
  );
  const group = commands.find(
    (command): command is Extract<DataviewCommand, { kind: "groupBy" }> =>
      command.kind === "groupBy",
  );
  const limit = commands.find(
    (command): command is Extract<DataviewCommand, { kind: "limit" }> =>
      command.kind === "limit",
  );

  return {
    type: type as DataviewQueryType,
    columns,
    expression,
    from: from?.from ?? null,
    where: where?.expression ?? null,
    sort: sort?.sort ?? [],
    groupBy: group?.field ?? null,
    limit: limit?.limit ?? null,
    withoutId,
    commands,
    groupExpression: group?.expression,
    groupLabel: group?.label,
    listExpression,
    calendarExpression,
  };
}

export type Clause = { key: string; lines: string[] };

export function segment(lines: readonly string[]): {
  headLines: string[];
  clauses: Clause[];
} {
  const headLines: string[] = [];
  const clauses: Clause[] = [];
  let current: Clause | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;

    const match = CLAUSE_PATTERN.exec(line);
    if (match) {
      const key = match[1].toLowerCase().replace(/\s+/g, " ");
      const text = match[2].trim();
      if (current) clauses.push(current);
      current = { key, lines: text.length > 0 ? [text] : [] };
      continue;
    }

    if (current) current.lines.push(line);
    else headLines.push(line);
  }

  if (current) clauses.push(current);
  return { headLines, clauses };
}

export function parseCommand(clause: Clause): DataviewCommand {
  const text = clause.lines.join(" ").trim();
  if (text.length === 0) {
    throw new DataviewParseError(
      `the \`${clause.key.toUpperCase()}\` clause is empty.`,
    );
  }

  switch (clause.key) {
    case "from":
      return { kind: "from", from: parseFrom(text) };
    case "where":
      return { kind: "where", expression: parseExpression(text) };
    case "flatten": {
      const { source, label } = splitAs(text);
      return {
        kind: "flatten",
        expression: parseExpression(source),
        ...(label === undefined ? {} : { label }),
      };
    }
    case "sort":
      return { kind: "sort", sort: parseSort(text) };
    case "group by": {
      const { source, label } = splitAs(text);
      return {
        kind: "groupBy",
        expression: parseExpression(source),
        field: source,
        ...(label === undefined ? {} : { label }),
      };
    }
    case "limit":
      return { kind: "limit", limit: parseLimit(text) };
    default:
      throw new DataviewParseError(`unsupported clause \`${clause.key}\`.`);
  }
}

export function parseTableHead(text: string): {
  columns: DataviewColumn[];
  withoutId: boolean;
} {
  const withoutId = /^without\s+id\b/i.test(text);
  const rest = withoutId ? text.replace(/^without\s+id\b/i, "").trim() : text;
  if (rest.length === 0) return { columns: [], withoutId };

  return {
    columns: splitTopLevel(rest, ",").map(parseColumn),
    withoutId,
  };
}

export function parseColumn(part: string): DataviewColumn {
  const { source, label } = splitAs(part);
  if (source.length === 0) {
    throw new DataviewParseError("a TABLE column is empty.");
  }
  const expression = parseExpression(source);
  return {
    field: source,
    expression,
    ...(label === undefined ? {} : { label }),
  };
}

export function splitAs(text: string): { source: string; label?: string } {
  let depth = 0;
  let quote: string | null = null;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === undefined) break;
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    else if (
      depth === 0 &&
      /\s/.test(char) &&
      /^as\b/i.test(text.slice(index + 1))
    ) {
      const source = text.slice(0, index).trim();
      const label = unquote(
        text
          .slice(index + 1)
          .replace(/^as\b/i, "")
          .trim(),
      );
      return { source, label };
    }
  }

  return { source: text.trim() };
}

export function parseSort(text: string): DataviewSort[] {
  return splitTopLevel(text, ",").map((part) => {
    const match = /^([\s\S]+?)(?:\s+(asc|desc|ascending|descending))?$/i.exec(
      part.trim(),
    );
    if (!match) {
      throw new DataviewParseError(`unsupported SORT term \`${part}\`.`);
    }
    const field = (match[1] ?? "").trim();
    if (field.length === 0) {
      throw new DataviewParseError(`unsupported SORT term \`${part}\`.`);
    }
    const order = (match[2] ?? "asc").toLowerCase();
    return {
      field,
      order: (order.startsWith("desc") ? "desc" : "asc") as DataviewSortOrder,
      expression: parseExpression(field),
    };
  });
}

export function parseLimit(text: string): number {
  const match = /^(\d+)$/.exec(text.trim());
  if (!match) {
    throw new DataviewParseError(
      `LIMIT expects a non-negative integer, received \`${text}\`.`,
    );
  }
  return Number(match[1]);
}
