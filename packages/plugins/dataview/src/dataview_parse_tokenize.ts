import { DataviewParseError } from "./parse-shared.js";
import type {
  DataviewArithmeticOperator,
  DataviewComparisonOperator,
} from "./types.js";

export type ExpressionToken =
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

export type ExpressionState = { tokens: ExpressionToken[]; index: number };

export function tokenizeExpression(text: string): ExpressionToken[] {
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

export function readQuoted(
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
