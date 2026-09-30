import { DataviewParseError, unquote } from "./parse-shared.js";
import type { DataviewFrom, DataviewSource } from "./types.js";

type FromToken =
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "not" }
  | { type: "and" }
  | { type: "or" }
  | { type: "source"; source: DataviewSource };

const FROM_TOKEN_PATTERN =
  /(\[\[[^\]]*\]\])|(#[^\s()]+)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\()|(\))|(!|-)|([^\s()]+)/g;

export function parseFrom(text: string): DataviewFrom {
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
  const node = parseOr(state);
  if (state.index < tokens.length) {
    throw new DataviewParseError("unexpected token in FROM.");
  }
  return node;
}

function toFromToken(match: RegExpExecArray): FromToken {
  const [raw, link, tag, doubleQuoted, singleQuoted, lparen, rparen, negate] =
    match;
  if (link !== undefined) {
    const value = link.slice(2, -2).split("|")[0].split("#")[0].trim();
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

function parseOr(state: FromState): DataviewFrom {
  let node = parseAnd(state);
  while (state.tokens[state.index]?.type === "or") {
    state.index += 1;
    node = { kind: "or", left: node, right: parseAnd(state) };
  }
  return node;
}

function parseAnd(state: FromState): DataviewFrom {
  let node = parseUnary(state);
  for (;;) {
    const token = state.tokens[state.index];
    if (token?.type === "and") {
      state.index += 1;
      node = { kind: "and", left: node, right: parseUnary(state) };
      continue;
    }
    if (
      token?.type === "source" ||
      token?.type === "lparen" ||
      token?.type === "not"
    ) {
      node = { kind: "and", left: node, right: parseUnary(state) };
      continue;
    }
    return node;
  }
}

function parseUnary(state: FromState): DataviewFrom {
  const token = state.tokens[state.index];
  if (!token) throw new DataviewParseError("unexpected end of FROM.");
  if (token.type === "not") {
    state.index += 1;
    return { kind: "not", child: parseUnary(state) };
  }
  if (token.type === "lparen") {
    state.index += 1;
    const node = parseOr(state);
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
