import type {
  ExpressionState,
  ExpressionToken,
} from "./dataview_parse_tokenize.js";
import { tokenizeExpression } from "./dataview_parse_tokenize.js";
import { DataviewParseError } from "./parse-shared.js";
import type { DataviewExpression } from "./types.js";

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

export function parseOr(state: ExpressionState): DataviewExpression {
  let node = parseAnd(state);
  while (isWord(state.tokens[state.index], "or")) {
    state.index += 1;
    node = { kind: "or", left: node, right: parseAnd(state) };
  }
  return node;
}

export function parseAnd(state: ExpressionState): DataviewExpression {
  let node = parseNot(state);
  while (isWord(state.tokens[state.index], "and")) {
    state.index += 1;
    node = { kind: "and", left: node, right: parseNot(state) };
  }
  return node;
}

export function parseNot(state: ExpressionState): DataviewExpression {
  if (state.tokens[state.index]?.type === "not") {
    state.index += 1;
    return { kind: "not", operand: parseNot(state) };
  }
  return parseComparison(state);
}

export function parseComparison(state: ExpressionState): DataviewExpression {
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

export function parseAdditive(state: ExpressionState): DataviewExpression {
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

export function parseMultiplicative(
  state: ExpressionState,
): DataviewExpression {
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

export function parseUnary(state: ExpressionState): DataviewExpression {
  const token = state.tokens[state.index];
  if (token?.type === "arith" && token.value === "-") {
    state.index += 1;
    return { kind: "unary", operator: "-", operand: parseUnary(state) };
  }
  return parsePrimary(state);
}

export function parsePrimary(state: ExpressionState): DataviewExpression {
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

export function parseCall(
  state: ExpressionState,
  name: string,
): DataviewExpression {
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

export function isWord(
  token: ExpressionToken | undefined,
  value: string,
): boolean {
  return token?.type === "word" && token.value.toLowerCase() === value;
}
