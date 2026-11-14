import { type BasesEntry, compare, folderOf } from "./conditions.js";
import type { EvaluationScope } from "./evaluate_core.js";
import { evaluateNested } from "./evaluate_delegate.js";
import { dateMember } from "./evaluate_methods.js";
import type { BasesExpression, BasesLiteral, BasesOperator } from "./types.js";

export function fileValue(entry: BasesEntry): Record<string, unknown> {
  const path = `${entry.slug}.md`;
  const name = path.split("/").at(-1) ?? path;
  return {
    name,
    basename: name.replace(/\.md$/i, ""),
    path,
    folder: folderOf(entry.slug),
    ext: "md",
    size: entry.file?.size,
    ctime: entry.file?.ctime,
    mtime: entry.file?.mtime,
    tags: entry.tags,
    links: entry.links.map((link) => link.slug ?? link.raw),
    properties: entry.frontmatter,
    link: entry.permalink,
  };
}

export function readMember(value: unknown, property: string): unknown {
  if (value === null || value === undefined) return undefined;
  if (
    property === "__proto__" ||
    property === "prototype" ||
    property === "constructor"
  )
    return undefined;
  if (value instanceof Date) return dateMember(value, property);
  if (
    property === "length" &&
    (typeof value === "string" || Array.isArray(value))
  )
    return value.length;
  if (typeof value === "object" && Object.hasOwn(value, property))
    return (value as Record<string, unknown>)[property];
  return undefined;
}

export function evaluateBinary(
  expression: Extract<BasesExpression, { kind: "binary" }>,
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
  active: ReadonlySet<string>,
): unknown {
  const left = evaluateNested(expression.left, entry, formulas, scope, active);
  if (expression.operator === "&&")
    return (
      left && evaluateNested(expression.right, entry, formulas, scope, active)
    );
  if (expression.operator === "||")
    return (
      left || evaluateNested(expression.right, entry, formulas, scope, active)
    );
  const right = evaluateNested(
    expression.right,
    entry,
    formulas,
    scope,
    active,
  );
  if (["==", "!=", ">", "<", ">=", "<="].includes(expression.operator))
    return compare(
      left,
      expression.operator as BasesOperator,
      right as BasesLiteral,
    );
  const dateArithmetic = evaluateDateArithmetic(
    left,
    expression.operator,
    right,
  );
  if (dateArithmetic !== undefined) return dateArithmetic;
  if (expression.operator === "+")
    return typeof left === "string" || typeof right === "string"
      ? `${left ?? ""}${right ?? ""}`
      : Number(left) + Number(right);
  if (expression.operator === "-") return Number(left) - Number(right);
  if (expression.operator === "*") return Number(left) * Number(right);
  if (expression.operator === "/")
    return Number(right) === 0 ? Number.NaN : Number(left) / Number(right);
  return Number(left) % Number(right);
}

export function evaluateDateArithmetic(
  left: unknown,
  operator: string,
  right: unknown,
): Date | number | undefined {
  if (!(left instanceof Date) || Number.isNaN(left.getTime())) return undefined;
  if (operator === "-" && right instanceof Date) {
    return left.getTime() - right.getTime();
  }
  if (typeof right !== "string" || (operator !== "+" && operator !== "-")) {
    return undefined;
  }
  const duration = parseDuration(right);
  if (!duration) return undefined;
  return offsetDate(left, duration, operator === "+" ? 1 : -1);
}

export function parseDuration(
  value: string,
): { readonly amount: number; readonly unit: string } | undefined {
  const match =
    /^\s*(-?\d+(?:\.\d+)?)\s*(y|year|years|M|month|months|d|day|days|w|week|weeks|h|hour|hours|m|minute|minutes|s|second|seconds)\s*$/.exec(
      value,
    );
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  return Number.isFinite(amount) && unit ? { amount, unit } : undefined;
}

export function offsetDate(
  source: Date,
  duration: { readonly amount: number; readonly unit: string },
  direction: 1 | -1,
): Date {
  const date = new Date(source.getTime());
  const amount = duration.amount * direction;
  switch (duration.unit) {
    case "y":
    case "year":
    case "years":
      date.setUTCFullYear(date.getUTCFullYear() + amount);
      return date;
    case "M":
    case "month":
    case "months":
      date.setUTCMonth(date.getUTCMonth() + amount);
      return date;
    case "w":
    case "week":
    case "weeks":
      date.setTime(date.getTime() + amount * 7 * 86_400_000);
      return date;
    case "d":
    case "day":
    case "days":
      date.setTime(date.getTime() + amount * 86_400_000);
      return date;
    case "h":
    case "hour":
    case "hours":
      date.setTime(date.getTime() + amount * 3_600_000);
      return date;
    case "m":
    case "minute":
    case "minutes":
      date.setTime(date.getTime() + amount * 60_000);
      return date;
    default:
      date.setTime(date.getTime() + amount * 1_000);
      return date;
  }
}
