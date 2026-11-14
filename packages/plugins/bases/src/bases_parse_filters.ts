import type { Result } from "./bases_parse_shared.js";
import { fail, ok, toList } from "./bases_parse_shared.js";
import {
  isBalanced,
  parseLiteral,
  parseValueRef,
  scalarLiteral,
  stripQuotes,
} from "./bases_parse_values.js";
import { parseBasesExpression } from "./expression.js";
import type { BasesCondition, BasesOperator } from "./types.js";

export function parseFilters(
  value: unknown,
  path: string,
): Result<BasesCondition | undefined> {
  if (value === undefined || value === null) return ok(undefined);

  if (typeof value === "string") {
    const text = value.trim();
    return text === "" ? ok(undefined) : parseExpression(text, path);
  }

  if (Array.isArray(value)) {
    return combineAnd(value, path);
  }

  if (typeof value === "object") {
    return parseFilterObject(value as Record<string, unknown>, path);
  }

  return fail(`${path} must be an expression, a list, or a filter object.`);
}

export function parseFilterObject(
  object: Record<string, unknown>,
  path: string,
): Result<BasesCondition | undefined> {
  const children: BasesCondition[] = [];

  if ("and" in object || "or" in object || "not" in object) {
    if ("and" in object) {
      const parsed = combineAnd(toList(object.and), `${path}.and`);
      if (parsed.ok === false) return parsed;
      if (parsed.value) children.push(parsed.value);
    }
    if ("or" in object) {
      const parsed = combineOr(toList(object.or), `${path}.or`);
      if (parsed.ok === false) return parsed;
      if (parsed.value) children.push(parsed.value);
    }
    if ("not" in object) {
      const parsed = combineAnd(toList(object.not), `${path}.not`);
      if (parsed.ok === false) return parsed;
      if (parsed.value) {
        children.push({ kind: "not", condition: parsed.value });
      }
    }
    return combineAndNodes(children);
  }

  // A plain mapping is treated as `property == value` equality.
  for (const [key, raw] of Object.entries(object)) {
    const parsed = propertyEquality(key, raw, `${path}.${key}`);
    if (parsed.ok === false) return parsed;
    children.push(parsed.value);
  }
  return combineAndNodes(children);
}

export function propertyEquality(
  key: string,
  value: unknown,
  path: string,
): Result<BasesCondition> {
  const ref = parseValueRef(key);
  if (Array.isArray(value)) {
    const conditions = value.map((item) => ({
      kind: "compare" as const,
      left: ref,
      operator: "==" as const,
      right: scalarLiteral(item),
    }));
    return conditions.length === 0
      ? fail(`${path} must not be an empty list.`)
      : ok({ kind: "or", conditions });
  }
  return ok({
    kind: "compare",
    left: ref,
    operator: "==",
    right: scalarLiteral(value),
  });
}

export function combineAnd(
  values: readonly unknown[],
  path: string,
): Result<BasesCondition | undefined> {
  const children: BasesCondition[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const parsed = parseFilters(values[index], `${path}[${index}]`);
    if (parsed.ok === false) return parsed;
    if (parsed.value) children.push(parsed.value);
  }
  return combineAndNodes(children);
}

export function combineOr(
  values: readonly unknown[],
  path: string,
): Result<BasesCondition | undefined> {
  const children: BasesCondition[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const parsed = parseFilters(values[index], `${path}[${index}]`);
    if (parsed.ok === false) return parsed;
    if (parsed.value) children.push(parsed.value);
  }
  if (children.length === 0) return ok(undefined);
  if (children.length === 1) return ok(children[0]);
  return ok({ kind: "or", conditions: children });
}

export function combineAndNodes(
  children: readonly BasesCondition[],
): Result<BasesCondition | undefined> {
  if (children.length === 0) return ok(undefined);
  if (children.length === 1) return ok(children[0]);
  return ok({ kind: "and", conditions: [...children] });
}

export function parseExpression(
  raw: string,
  path: string,
): Result<BasesCondition> {
  const expression = parseBasesExpression(raw);
  if (expression.ok)
    return ok({ kind: "expression", expression: expression.value });

  let text = raw.trim();
  while (
    text.startsWith("(") &&
    text.endsWith(")") &&
    isBalanced(text.slice(1, -1))
  ) {
    text = text.slice(1, -1).trim();
  }
  if (text === "") return fail(`${path} contains an empty filter expression.`);

  const call = text.match(/^(?:file|note)\.(\w+)\s*\(\s*(.*?)\s*\)$/i);
  if (call) {
    const name = call[1].toLowerCase();
    const argument = stripQuotes(call[2]);
    if (argument === "") {
      return fail(`${path} has a ${name}() call without an argument.`);
    }
    if (name === "hastag") return ok({ kind: "hasTag", tag: argument });
    if (name === "infolder") return ok({ kind: "inFolder", folder: argument });
    if (name === "haslink") return ok({ kind: "hasLink", link: argument });
    return fail(`${path} uses an unsupported function \`${name}()\`.`);
  }

  if (/^[a-z_][\w.]*\s*\(/i.test(text)) {
    return fail(`${path} uses an unsupported function in \`${text}\`.`);
  }

  const contains = text.match(/^(.+?)\s+contains\s+(.+)$/i);
  if (contains) {
    return comparisonFrom(contains[1], "contains", contains[2], path);
  }

  const comparison = text.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparison) {
    return comparisonFrom(
      comparison[1],
      comparison[2] as BasesOperator,
      comparison[3],
      path,
    );
  }

  return fail(`${path} uses an unsupported filter expression \`${raw}\`.`);
}

export function comparisonFrom(
  left: string,
  operator: BasesOperator,
  right: string,
  path: string,
): Result<BasesCondition> {
  const reference = left.trim();
  if (reference === "") {
    return fail(`${path} is missing a left-hand side for \`${operator}\`.`);
  }
  return ok({
    kind: "compare",
    left: parseValueRef(reference),
    operator,
    right: parseLiteral(right),
  });
}
