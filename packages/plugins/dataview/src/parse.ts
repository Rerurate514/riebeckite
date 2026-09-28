import type {
  DataviewColumn,
  DataviewComparisonOperator,
  DataviewExpression,
  DataviewFrom,
  DataviewParseResult,
  DataviewQueryType,
  DataviewSort,
  DataviewSortOrder,
  DataviewSource,
  DataviewSpec,
} from "./types.js";

const QUERY_TYPES = new Set<DataviewQueryType>([
  "list",
  "table",
  "task",
  "calendar",
]);

const CLAUSE_PATTERN = /^(from|where|sort|group\s+by|limit)\b(.*)$/i;
const FIELD_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

class DataviewParseError extends Error {}

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
    throw new DataviewParseError("a dataview block must start with a query type.");
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
  if (type === "table") {
    columns =
      headText.length > 0
        ? parseColumns(headText)
        : [{ field: "file.link" }];
  } else if (type === "list" || type === "calendar") {
    expression = headText.length > 0 ? headText : null;
  } else if (headText.length > 0) {
    throw new DataviewParseError("TASK does not accept a column or expression list.");
  }

  const fromText = takeClause(clauses, "from");
  const whereText = takeClause(clauses, "where");
  const sortText = takeClause(clauses, "sort");
  const groupText = takeClause(clauses, "group by");
  const limitText = takeClause(clauses, "limit");

  return {
    type: type as DataviewQueryType,
    columns,
    expression,
    from: fromText ? parseFrom(fromText) : null,
    where: whereText ? parseExpression(whereText) : null,
    sort: sortText ? parseSort(sortText) : [],
    groupBy: groupText ? parseField(groupText, "GROUP BY") : null,
    limit: limitText ? parseLimit(limitText) : null,
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

function takeClause(clauses: readonly Clause[], key: string): string | null {
  const matches = clauses.filter((clause) => clause.key === key);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new DataviewParseError(`the \`${key.toUpperCase()}\` clause appears more than once.`);
  }
  const text = matches[0].lines.join(" ").trim();
  if (text.length === 0) {
    throw new DataviewParseError(`the \`${key.toUpperCase()}\` clause is empty.`);
  }
  return text;
}

function parseColumns(text: string): DataviewColumn[] {
  const parts = splitTopLevel(text, ",");
  if (parts.length === 0) return [{ field: "file.link" }];
  return parts.map(parseColumn);
}

function parseColumn(part: string): DataviewColumn {
  const asMatch = /\s+as\s+([\s\S]+)$/i.exec(part);
  let fieldPart = part;
  let label: string | undefined;

  if (asMatch && asMatch.index !== undefined) {
    fieldPart = part.slice(0, asMatch.index).trim();
    label = unquote(asMatch[1].trim());
  }

  if (fieldPart.length === 0) {
    throw new DataviewParseError("a TABLE column is empty.");
  }

  const field = parseField(fieldPart, "TABLE column");
  return label === undefined ? { field } : { field, label };
}

function parseSort(text: string): DataviewSort[] {
  return splitTopLevel(text, ",").map((part) => {
    const match = /^(\S+)(?:\s+(asc|desc))?$/i.exec(part.trim());
    if (!match) {
      throw new DataviewParseError(`unsupported SORT term \`${part}\`.`);
    }
    return {
      field: parseField(match[1], "SORT"),
      order: (match[2]?.toLowerCase() as DataviewSortOrder | undefined) ?? "asc",
    };
  });
}

function parseLimit(text: string): number {
  const match = /^(\d+)$/.exec(text.trim());
  if (!match) {
    throw new DataviewParseError(`LIMIT expects a non-negative integer, received \`${text}\`.`);
  }
  return Number(match[1]);
}

function parseField(value: string, context: string): string {
  const field = value.trim();
  if (!FIELD_PATTERN.test(field)) {
    throw new DataviewParseError(`unsupported ${context} field \`${field}\`.`);
  }
  return field;
}

/* -------------------------------------------------------------------------- */
/* FROM                                                                       */
/* -------------------------------------------------------------------------- */

type FromToken =
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "not" }
  | { type: "and" }
  | { type: "or" }
  | { type: "source"; source: DataviewSource };

const FROM_TOKEN_PATTERN =
  /(\[\[[^\]]*\]\])|(#[^\s()]+)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\()|(\))|(!|-)|([^\s()]+)/g;

function parseFrom(text: string): DataviewFrom {
  const tokens: FromToken[] = [];
  FROM_TOKEN_PATTERN.lastIndex = 0;

  for (
    let match = FROM_TOKEN_PATTERN.exec(text);
    match !== null;
    match = FROM_TOKEN_PATTERN.exec(text)
  ) {
    tokens.push(toFromToken(match));
  }

  if (tokens.length === 0) {
    throw new DataviewParseError("the FROM clause is empty.");
  }

  const state = { tokens, index: 0 };
  const node = parseFromOr(state);
  if (state.index < tokens.length) {
    throw new DataviewParseError("unexpected token in FROM.");
  }
  return node;
}

function toFromToken(match: RegExpExecArray): FromToken {
  const [raw, link, tag, doubleQuoted, singleQuoted, lparen, rparen, negate] =
    match;
  if (link !== undefined) {
    const value = link
      .slice(2, -2)
      .split("|")[0]
      .split("#")[0]
      .trim();
    if (value.length === 0) {
      throw new DataviewParseError("a link source in FROM is empty.");
    }
    return { type: "source", source: { kind: "link", value } };
  }
  if (tag !== undefined) {
    return { type: "source", source: { kind: "tag", value: tag.slice(1) } };
  }
  if (doubleQuoted !== undefined || singleQuoted !== undefined) {
    return {
      type: "source",
      source: { kind: "folder", value: unquote(raw.trim()) },
    };
  }
  if (lparen !== undefined) return { type: "lparen" };
  if (rparen !== undefined) return { type: "rparen" };
  if (negate !== undefined) return { type: "not" };

  const word = (raw ?? "").toLowerCase();
  if (word === "and") return { type: "and" };
  if (word === "or") return { type: "or" };
  return { type: "source", source: { kind: "folder", value: raw.trim() } };
}

type FromState = { tokens: FromToken[]; index: number };

function parseFromOr(state: FromState): DataviewFrom {
  let node = parseFromAnd(state);
  while (state.tokens[state.index]?.type === "or") {
    state.index += 1;
    node = { kind: "or", left: node, right: parseFromAnd(state) };
  }
  return node;
}

function parseFromAnd(state: FromState): DataviewFrom {
  let node = parseFromUnary(state);
  for (;;) {
    const token = state.tokens[state.index];
    if (token?.type === "and") {
      state.index += 1;
      node = { kind: "and", left: node, right: parseFromUnary(state) };
      continue;
    }
    if (
      token?.type === "source" ||
      token?.type === "lparen" ||
      token?.type === "not"
    ) {
      node = { kind: "and", left: node, right: parseFromUnary(state) };
      continue;
    }
    return node;
  }
}

function parseFromUnary(state: FromState): DataviewFrom {
  const token = state.tokens[state.index];
  if (!token) throw new DataviewParseError("unexpected end of FROM.");

  if (token.type === "not") {
    state.index += 1;
    return { kind: "not", child: parseFromUnary(state) };
  }
  if (token.type === "lparen") {
    state.index += 1;
    const node = parseFromOr(state);
    if (state.tokens[state.index]?.type !== "rparen") {
      throw new DataviewParseError("unbalanced parentheses in FROM.");
    }
    state.index += 1;
    return node;
  }
  if (token.type === "source") {
    state.index += 1;
    return { kind: "source", source: token.source };
  }
  throw new DataviewParseError("unexpected token in FROM.");
}

/* -------------------------------------------------------------------------- */
/* WHERE                                                                      */
/* -------------------------------------------------------------------------- */

type ExpressionToken =
  | { type: "op"; value: DataviewComparisonOperator }
  | { type: "not" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "word"; value: string };

function parseExpression(text: string): DataviewExpression {
  const tokens = tokenizeExpression(text);
  if (tokens.length === 0) {
    throw new DataviewParseError("the WHERE clause is empty.");
  }
  const state: ExpressionState = { tokens, index: 0 };
  const node = parseOr(state);
  if (state.index < tokens.length) {
    throw new DataviewParseError("unexpected token in the WHERE expression.");
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
    if (
      pair === ">=" ||
      pair === "<=" ||
      pair === "!="
    ) {
      tokens.push({ type: "op", value: pair as DataviewComparisonOperator });
      index += 2;
      continue;
    }
    if (char === "=" || char === ">" || char === "<") {
      tokens.push({ type: "op", value: char });
      index += 1;
      continue;
    }
    if (char === "!") {
      tokens.push({ type: "not" });
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
    if (/[0-9]/.test(char) || (char === "-" && /[0-9]/.test(text[index + 1] ?? ""))) {
      const match = /^-?\d+(?:\.\d+)?/.exec(text.slice(index));
      if (match) {
        tokens.push({ type: "number", value: Number(match[0]) });
        index += match[0].length;
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      const match = /^[A-Za-z_$][A-Za-z0-9_$.]*/.exec(text.slice(index));
      if (match) {
        tokens.push({ type: "word", value: match[0] });
        index += match[0].length;
        continue;
      }
    }
    throw new DataviewParseError(`unexpected character \`${char}\` in WHERE.`);
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

  throw new DataviewParseError("unterminated string literal in WHERE.");
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
  let node = parseUnary(state);
  while (isWord(state.tokens[state.index], "and")) {
    state.index += 1;
    node = { kind: "and", left: node, right: parseUnary(state) };
  }
  return node;
}

function parseUnary(state: ExpressionState): DataviewExpression {
  if (state.tokens[state.index]?.type === "not") {
    state.index += 1;
    return { kind: "not", operand: parseUnary(state) };
  }
  return parseComparison(state);
}

function parseComparison(state: ExpressionState): DataviewExpression {
  const left = parsePrimary(state);
  const token = state.tokens[state.index];
  if (token?.type !== "op") return left;
  state.index += 1;
  return {
    kind: "compare",
    operator: token.value,
    left,
    right: parsePrimary(state),
  };
}

function parsePrimary(state: ExpressionState): DataviewExpression {
  const token = state.tokens[state.index];
  if (!token) {
    throw new DataviewParseError("unexpected end of the WHERE expression.");
  }

  if (token.type === "lparen") {
    state.index += 1;
    const node = parseOr(state);
    if (state.tokens[state.index]?.type !== "rparen") {
      throw new DataviewParseError("unbalanced parentheses in WHERE.");
    }
    state.index += 1;
    return node;
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
      return parseCall(state, lower);
    }
    state.index += 1;
    return { kind: "field", path: token.value.split(".") };
  }
  throw new DataviewParseError("unexpected token in the WHERE expression.");
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

function isWord(
  token: ExpressionToken | undefined,
  value: string,
): boolean {
  return token?.type === "word" && token.value.toLowerCase() === value;
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (const char of text) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  parts.push(current.trim());
  return parts.filter((part) => part.length > 0);
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

export { DataviewParseError };
