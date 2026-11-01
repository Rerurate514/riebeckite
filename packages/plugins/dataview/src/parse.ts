import { parseFrom } from "./parse-from.js";
import { DataviewParseError, splitTopLevel, unquote } from "./parse-shared.js";
import type {
  DataviewArithmeticOperator,
  DataviewColumn,
  DataviewCommand,
  DataviewComparisonOperator,
  DataviewExpression,
  DataviewParseResult,
  DataviewQueryType,
  DataviewSort,
  DataviewSortOrder,
  DataviewSpec,
} from "./types.js";

const QUERY_TYPES = new Set<DataviewQueryType>([
  "list",
  "table",
  "task",
  "calendar",
]);

const CLAUSE_PATTERN = /^(from|where|sort|group\s+by|limit|flatten)\b(.*)$/i;

/**
 * Parse a declarative `dataview` block body into a {@link DataviewSpec}.
 *
 * The parser never throws: unsupported or malformed input is reported as a
 * failed {@link DataviewParseResult} so callers can render a fallback.
 */
export function parseDataview(source: string): DataviewParseResult {
  try {
    return { status: "ok", spec: parseSpec(source) };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof DataviewParseError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
    };
  }
}

function parseSpec(source: string): DataviewSpec {
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

type Clause = { key: string; lines: string[] };

function segment(lines: readonly string[]): {
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

function parseCommand(clause: Clause): DataviewCommand {
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

function parseTableHead(text: string): {
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

function parseColumn(part: string): DataviewColumn {
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

/** Splits `expression AS label` at a top-level `as` keyword. */
function splitAs(text: string): { source: string; label?: string } {
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

function parseSort(text: string): DataviewSort[] {
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

function parseLimit(text: string): number {
  const match = /^(\d+)$/.exec(text.trim());
  if (!match) {
    throw new DataviewParseError(
      `LIMIT expects a non-negative integer, received \`${text}\`.`,
    );
  }
  return Number(match[1]);
}

/* -------------------------------------------------------------------------- */
/* Expressions                                                                */
/* -------------------------------------------------------------------------- */

type ExpressionToken =
  | { type: "op"; value: DataviewComparisonOperator }
  | { type: "arith"; value: DataviewArithmeticOperator }
  | { type: "not" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "lbracket" }
  | { type: "rbracket" }
  | { type: "comma" }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "word"; value: string };

export function parseExpression(text: string): DataviewExpression {
  const tokens = tokenizeExpression(text);
  if (tokens.length === 0) {
    throw new DataviewParseError("the expression is empty.");
  }
  const state: ExpressionState = { tokens, index: 0 };
  const node = parseOr(state);
  if (state.index < tokens.length) {
    throw new DataviewParseError("unexpected token in the expression.");
  }
  return node;
}

type ExpressionState = { tokens: ExpressionToken[]; index: number };

function tokenizeExpression(text: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (char === undefined) break;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const pair = text.slice(index, index + 2);
    if (pair === ">=" || pair === "<=" || pair === "!=") {
      tokens.push({ type: "op", value: pair as DataviewComparisonOperator });
      index += 2;
      continue;
    }
    if (pair === "&&") {
      tokens.push({ type: "word", value: "and" });
      index += 2;
      continue;
    }
    if (pair === "||") {
      tokens.push({ type: "word", value: "or" });
      index += 2;
      continue;
    }
    if (char === "=" || char === ">" || char === "<") {
      tokens.push({ type: "op", value: char });
      index += 1;
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "arith", value: char });
      index += 1;
      continue;
    }
    if (char === "%") {
      tokens.push({ type: "arith", value: "%" });
      index += 1;
      continue;
    }
    if (char === "!") {
      tokens.push({ type: "not" });
      index += 1;
      continue;
    }
    if (char === "&") {
      tokens.push({ type: "word", value: "and" });
      index += 1;
      continue;
    }
    if (char === "|") {
      tokens.push({ type: "word", value: "or" });
      index += 1;
      continue;
    }
    if (char === "(") {
      tokens.push({ type: "lparen" });
      index += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rparen" });
      index += 1;
      continue;
    }
    if (char === "[") {
      tokens.push({ type: "lbracket" });
      index += 1;
      continue;
    }
    if (char === "]") {
      tokens.push({ type: "rbracket" });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma" });
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quoted = readQuoted(text, index);
      tokens.push({ type: "string", value: quoted.value });
      index = quoted.next;
      continue;
    }
    if (
      /[0-9]/.test(char) ||
      (char === "." && /[0-9]/.test(text[index + 1] ?? ""))
    ) {
      const match = /^\d*\.?\d+/.exec(text.slice(index));
      if (match) {
        tokens.push({ type: "number", value: Number(match[0]) });
        index += match[0].length;
        continue;
      }
    }
    if (/[\p{L}_$]/u.test(char)) {
      const match = /^[\p{L}\p{N}_$.]*/u.exec(text.slice(index));
      if (match) {
        tokens.push({ type: "word", value: match[0] });
        index += match[0].length;
        continue;
      }
    }
    throw new DataviewParseError(
      `unexpected character \`${char}\` in the query.`,
    );
  }

  return tokens;
}

function readQuoted(
  text: string,
  start: number,
): { value: string; next: number } {
  const quote = text[start];
  let value = "";
  let index = start + 1;

  while (index < text.length) {
    const char = text[index];
    if (char === undefined) break;
    if (char === "\\" && index + 1 < text.length) {
      value += text[index + 1];
      index += 2;
      continue;
    }
    if (char === quote) return { value, next: index + 1 };
    value += char;
    index += 1;
  }

  throw new DataviewParseError("unterminated string literal in the query.");
}

function parseOr(state: ExpressionState): DataviewExpression {
  let node = parseAnd(state);
  while (isWord(state.tokens[state.index], "or")) {
    state.index += 1;
    node = { kind: "or", left: node, right: parseAnd(state) };
  }
  return node;
}

function parseAnd(state: ExpressionState): DataviewExpression {
  let node = parseNot(state);
  while (isWord(state.tokens[state.index], "and")) {
    state.index += 1;
    node = { kind: "and", left: node, right: parseNot(state) };
  }
  return node;
}

function parseNot(state: ExpressionState): DataviewExpression {
  if (state.tokens[state.index]?.type === "not") {
    state.index += 1;
    return { kind: "not", operand: parseNot(state) };
  }
  return parseComparison(state);
}

function parseComparison(state: ExpressionState): DataviewExpression {
  const left = parseAdditive(state);
  const token = state.tokens[state.index];
  if (token?.type !== "op") return left;
  state.index += 1;
  return {
    kind: "compare",
    operator: token.value,
    left,
    right: parseAdditive(state),
  };
}

function parseAdditive(state: ExpressionState): DataviewExpression {
  let node = parseMultiplicative(state);
  for (;;) {
    const token = state.tokens[state.index];
    if (token?.type !== "arith" || (token.value !== "+" && token.value !== "-"))
      return node;
    state.index += 1;
    node = {
      kind: "arithmetic",
      operator: token.value,
      left: node,
      right: parseMultiplicative(state),
    };
  }
}

function parseMultiplicative(state: ExpressionState): DataviewExpression {
  let node = parseUnary(state);
  for (;;) {
    const token = state.tokens[state.index];
    if (
      token?.type !== "arith" ||
      (token.value !== "*" && token.value !== "/" && token.value !== "%")
    )
      return node;
    state.index += 1;
    node = {
      kind: "arithmetic",
      operator: token.value,
      left: node,
      right: parseUnary(state),
    };
  }
}

function parseUnary(state: ExpressionState): DataviewExpression {
  const token = state.tokens[state.index];
  if (token?.type === "arith" && token.value === "-") {
    state.index += 1;
    return { kind: "unary", operator: "-", operand: parseUnary(state) };
  }
  return parsePrimary(state);
}

function parsePrimary(state: ExpressionState): DataviewExpression {
  const token = state.tokens[state.index];
  if (!token) {
    throw new DataviewParseError("unexpected end of the expression.");
  }

  if (token.type === "lparen") {
    state.index += 1;
    const node = parseOr(state);
    if (state.tokens[state.index]?.type !== "rparen") {
      throw new DataviewParseError("unbalanced parentheses in the query.");
    }
    state.index += 1;
    return node;
  }
  if (token.type === "lbracket") {
    state.index += 1;
    const items: DataviewExpression[] = [];
    if (state.tokens[state.index]?.type !== "rbracket") {
      items.push(parseOr(state));
      while (state.tokens[state.index]?.type === "comma") {
        state.index += 1;
        items.push(parseOr(state));
      }
    }
    if (state.tokens[state.index]?.type !== "rbracket") {
      throw new DataviewParseError("unbalanced brackets in the query.");
    }
    state.index += 1;
    return { kind: "list", items };
  }
  if (token.type === "string" || token.type === "number") {
    state.index += 1;
    return { kind: "literal", value: token.value };
  }
  if (token.type === "word") {
    const lower = token.value.toLowerCase();
    if (lower === "true" || lower === "false") {
      state.index += 1;
      return { kind: "literal", value: lower === "true" };
    }
    if (lower === "null") {
      state.index += 1;
      return { kind: "literal", value: null };
    }
    if (state.tokens[state.index + 1]?.type === "lparen") {
      return parseCall(state, token.value.toLowerCase());
    }
    state.index += 1;
    return { kind: "field", path: token.value.split(".") };
  }
  throw new DataviewParseError("unexpected token in the expression.");
}

function parseCall(state: ExpressionState, name: string): DataviewExpression {
  state.index += 2;
  const args: DataviewExpression[] = [];
  if (state.tokens[state.index]?.type !== "rparen") {
    args.push(parseOr(state));
    while (state.tokens[state.index]?.type === "comma") {
      state.index += 1;
      args.push(parseOr(state));
    }
  }
  if (state.tokens[state.index]?.type !== "rparen") {
    throw new DataviewParseError(`unbalanced parentheses in \`${name}()\`.`);
  }
  state.index += 1;
  return { kind: "call", name, args };
}

function isWord(token: ExpressionToken | undefined, value: string): boolean {
  return token?.type === "word" && token.value.toLowerCase() === value;
}

export { DataviewParseError } from "./parse-shared.js";
