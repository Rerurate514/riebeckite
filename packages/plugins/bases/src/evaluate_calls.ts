import { type ContentLink, escapeHtml } from "@riebeckite/core";
import { type BasesEntry, hasLink, hasTag, inFolder } from "./conditions.js";
import type { EvaluationScope } from "./evaluate_core.js";
import { evaluateNested } from "./evaluate_delegate.js";
import {
  arrayMethod,
  duration,
  isType,
  numberMethod,
  objectMethod,
  parseDate,
  stringValue,
} from "./evaluate_methods.js";
import {
  evaluateHigherOrderCall,
  formatDate,
  startOfUtcDate,
  titleCase,
} from "./evaluate_misc.js";
import type { BasesExpression } from "./types.js";

export function evaluateCall(
  expression: Extract<BasesExpression, { kind: "call" }>,
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
  active: ReadonlySet<string>,
): unknown {
  if (expression.callee.kind === "member") {
    const target = evaluateNested(
      expression.callee.object,
      entry,
      formulas,
      scope,
      active,
    );
    const higherOrder = evaluateHigherOrderCall(
      target,
      expression.callee.property,
      expression.arguments,
      entry,
      formulas,
      scope,
      active,
    );
    if (higherOrder.handled) return higherOrder.value;
  }
  const args = expression.arguments.map((argument) =>
    evaluateNested(argument, entry, formulas, scope, active),
  );
  if (expression.callee.kind === "reference")
    return globalCall(expression.callee.path[0] ?? "", args);
  if (expression.callee.kind !== "member") return undefined;
  const target = evaluateNested(
    expression.callee.object,
    entry,
    formulas,
    scope,
    active,
  );
  return memberCall(target, expression.callee.property, args);
}

export function globalCall(name: string, args: readonly unknown[]): unknown {
  if (name === "if") return args[0] ? args[1] : (args[2] ?? null);
  if (name === "list")
    return args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  if (name === "number") return Number(args[0]);
  if (name === "length")
    return Array.isArray(args[0]) || typeof args[0] === "string"
      ? args[0].length
      : 0;
  if (name === "min") return Math.min(...args.map(Number));
  if (name === "max") return Math.max(...args.map(Number));
  if (name === "date") return parseDate(args[0]);
  if (name === "duration") return duration(args[0], args[1]);
  if (name === "isTruthy") return Boolean(args[0]);
  if (name === "isType") return isType(args[0], args[1]);
  if (name === "toString") return stringValue(args[0]);
  if (name === "escapeHTML") return escapeHtml(String(args[0] ?? ""));
  return undefined;
}

export function memberCall(
  target: unknown,
  name: string,
  args: readonly unknown[],
): unknown {
  if (
    name === "hasTag" &&
    target &&
    typeof target === "object" &&
    "tags" in target
  )
    return args.some((value) =>
      hasTag((target as { tags: readonly string[] }).tags, String(value)),
    );
  if (
    name === "hasLink" &&
    target &&
    typeof target === "object" &&
    "links" in target
  )
    return hasLink(
      (target as { links: readonly ContentLink[] }).links,
      String(args[0]),
    );
  if (
    name === "inFolder" &&
    target &&
    typeof target === "object" &&
    "folder" in target
  )
    return inFolder(
      String((target as { folder: unknown }).folder),
      String(args[0]),
    );
  if (
    name === "hasProperty" &&
    target &&
    typeof target === "object" &&
    "properties" in target
  ) {
    const properties = (target as { properties: unknown }).properties;
    return (
      properties !== null &&
      typeof properties === "object" &&
      Object.hasOwn(properties, String(args[0] ?? ""))
    );
  }
  if (target instanceof Date) {
    return dateMethod(target, name, args) ?? objectMethod(target, name);
  }
  if (typeof target === "string") return stringMethod(target, name, args);
  if (Array.isArray(target)) {
    return arrayMethod(target, name, args) ?? objectMethod(target, name);
  }
  if (typeof target === "number") return numberMethod(target, name, args);
  if (target !== null && typeof target === "object") {
    return objectMethod(target, name);
  }
  return undefined;
}

export function dateMethod(
  date: Date,
  name: string,
  args: readonly unknown[],
): unknown {
  if (name === "format") return formatDate(date, String(args[0] ?? ""));
  if (name === "date") return startOfUtcDate(date);
  if (name === "time") return date.getTime();
  return undefined;
}

export function stringMethod(
  target: string,
  name: string,
  args: readonly unknown[],
): unknown {
  if (name === "lower") return target.toLowerCase();
  if (name === "upper") return target.toUpperCase();
  if (name === "contains") return target.includes(String(args[0]));
  if (name === "containsAll")
    return args.every((value) => target.includes(String(value)));
  if (name === "containsAny")
    return args.some((value) => target.includes(String(value)));
  if (name === "startsWith") return target.startsWith(String(args[0]));
  if (name === "endsWith") return target.endsWith(String(args[0]));
  if (name === "trim") return target.trim();
  if (name === "reverse") return [...target].reverse().join("");
  if (name === "repeat")
    return target.repeat(Math.max(0, Number(args[0] ?? 0)));
  if (name === "slice")
    return target.slice(
      Number(args[0] ?? 0),
      args[1] === undefined ? undefined : Number(args[1]),
    );
  if (name === "isEmpty") return target.length === 0;
  if (name === "split") return target.split(String(args[0]));
  if (name === "replace")
    return target.split(String(args[0])).join(String(args[1] ?? ""));
  if (name === "title") return titleCase(target);
  return undefined;
}
