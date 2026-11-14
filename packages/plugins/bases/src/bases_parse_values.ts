import type { Result } from "./bases_parse_shared.js";
import { BUILTIN_ALIASES, fail, ok } from "./bases_parse_shared.js";
import { parseBasesExpression } from "./expression.js";
import type { BasesLiteral, BasesValueRef } from "./types.js";

export function parseValueRef(raw: string): BasesValueRef {
  const key = stripQuotes(raw.trim());
  const lower = key.toLowerCase();

  const alias = BUILTIN_ALIASES[lower];
  if (alias !== undefined) {
    return { source: "builtin", name: alias };
  }

  if (lower.startsWith("note.")) {
    return { source: "frontmatter", key: key.slice("note.".length) };
  }
  if (lower.startsWith("file.frontmatter.")) {
    return {
      source: "frontmatter",
      key: key.slice("file.frontmatter.".length),
    };
  }
  if (lower.startsWith("file.")) {
    return { source: "frontmatter", key: key.slice("file.".length) };
  }
  return { source: "frontmatter", key };
}

export function parseLiteral(raw: string): BasesLiteral {
  const text = raw.trim();
  if (isQuoted(text)) return stripQuotes(text);
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

export function scalarLiteral(value: unknown): BasesLiteral {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

export function isQuoted(value: string): boolean {
  if (value.length < 2) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}

export function stripQuotes(value: string): string {
  const text = value.trim();
  return isQuoted(text) ? text.slice(1, -1) : text;
}

export function isBalanced(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

export function parseProperties(
  value: unknown,
): Result<Record<string, string>> {
  if (value === undefined || value === null) return ok({});
  if (typeof value !== "object" || Array.isArray(value)) {
    return fail("`properties` must be a YAML mapping.");
  }

  const labels: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    labels[key] = propertyLabel(key, raw);
  }
  return ok(labels);
}

export function parseFormulas(
  value: unknown,
): Result<Record<string, import("./types.js").BasesExpression>> {
  if (value === undefined || value === null) return ok({});
  if (typeof value !== "object" || Array.isArray(value))
    return fail("`formulas` must be a YAML mapping.");
  const formulas: Record<string, import("./types.js").BasesExpression> = {};
  for (const [name, source] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof source !== "string")
      return fail(`formulas.${name} must be a string expression.`);
    const expression = parseBasesExpression(source);
    if (expression.ok === false)
      return fail(`formulas.${name} is invalid (${expression.message}).`);
    formulas[name] = expression.value;
  }
  return ok(formulas);
}

export function propertyLabel(key: string, raw: unknown): string {
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const displayName = (raw as Record<string, unknown>).displayName;
    if (typeof displayName === "string" && displayName.trim() !== "") {
      return displayName;
    }
  }
  return key;
}
