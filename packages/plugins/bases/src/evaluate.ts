import type { ContentLink, ContentManifestEntry } from "@riebeckite/core";
import type {
  BasesBuiltinValue,
  BasesCondition,
  BasesExpression,
  BasesLiteral,
  BasesOperator,
  BasesValueRef,
} from "./types.js";

const MAX_EVALUATION_STEPS = 10_000;
const MAX_EVALUATION_DEPTH = 128;
const EVALUATION_BUDGET = Symbol("bases-evaluation-budget");

type EvaluationBudget = { remaining: number; depth: number };

export class BasesEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BasesEvaluationError";
  }
}

/** Evaluates a compiled condition against one manifest entry. */
export function matchesCondition(
  condition: BasesCondition,
  entry: ContentManifestEntry,
): boolean {
  switch (condition.kind) {
    case "and":
      return condition.conditions.every((child) =>
        matchesCondition(child, entry),
      );
    case "or":
      return condition.conditions.some((child) =>
        matchesCondition(child, entry),
      );
    case "not":
      return !matchesCondition(condition.condition, entry);
    case "hasTag":
      return hasTag(entry.tags, condition.tag);
    case "inFolder":
      return inFolder(entry.slug, condition.folder);
    case "hasLink":
      return hasLink(entry.links, condition.link);
    case "compare":
      return compare(
        resolveValueRef(condition.left, entry),
        condition.operator,
        condition.right,
      );
    case "expression":
      return Boolean(evaluateBasesExpression(condition.expression, entry));
    default:
      return false;
  }
}

export function evaluateBasesExpression(
  expression: BasesExpression,
  entry: ContentManifestEntry,
  formulas: Readonly<Record<string, BasesExpression>> = {},
  scope: Readonly<Record<string, unknown>> = {},
  active: ReadonlySet<string> = new Set(),
): unknown {
  const budget = evaluationBudget(scope);
  if (budget.remaining <= 0) {
    throw new BasesEvaluationError(
      `Formula evaluation exceeded ${MAX_EVALUATION_STEPS} steps.`,
    );
  }
  if (budget.depth >= MAX_EVALUATION_DEPTH) {
    throw new BasesEvaluationError(
      `Formula evaluation exceeded ${MAX_EVALUATION_DEPTH} nested expressions.`,
    );
  }
  budget.remaining -= 1;
  budget.depth += 1;
  try {
    switch (expression.kind) {
      case "literal":
        return expression.value;
      case "array":
        return expression.values.map((value) =>
          evaluateBasesExpression(value, entry, formulas, scope, active),
        );
      case "reference":
        return resolvePath(expression.path, entry, formulas, scope, active);
      case "member":
        return readMember(
          evaluateBasesExpression(
            expression.object,
            entry,
            formulas,
            scope,
            active,
          ),
          expression.property,
        );
      case "index":
        return readMember(
          evaluateBasesExpression(
            expression.object,
            entry,
            formulas,
            scope,
            active,
          ),
          String(
            evaluateBasesExpression(
              expression.index,
              entry,
              formulas,
              scope,
              active,
            ),
          ),
        );
      case "unary": {
        const value = evaluateBasesExpression(
          expression.value,
          entry,
          formulas,
          scope,
          active,
        );
        return expression.operator === "!"
          ? !value
          : typeof value === "number"
            ? -value
            : Number.NaN;
      }
      case "binary":
        return evaluateBinary(expression, entry, formulas, scope, active);
      case "call":
        return evaluateCall(expression, entry, formulas, scope, active);
    }
  } finally {
    budget.depth -= 1;
  }
}

function evaluationBudget(
  scope: Readonly<Record<string, unknown>>,
): EvaluationBudget {
  const values = scope as unknown as Record<PropertyKey, unknown>;
  const existing = values[EVALUATION_BUDGET];
  if (existing && typeof existing === "object") {
    return existing as EvaluationBudget;
  }
  const budget: EvaluationBudget = {
    remaining: MAX_EVALUATION_STEPS,
    depth: 0,
  };
  values[EVALUATION_BUDGET] = budget;
  return budget;
}

function resolvePath(
  path: readonly string[],
  entry: ContentManifestEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: Readonly<Record<string, unknown>>,
  active: ReadonlySet<string>,
): unknown {
  const [first] = path;
  if (!first) return undefined;
  if (Object.hasOwn(scope, first)) return scope[first];
  if (first === "file") return fileValue(entry);
  if (first === "note") return entry.frontmatter;
  if (first === "formula")
    return new Proxy(
      {},
      {
        get: (_target, property) =>
          resolveFormula(String(property), entry, formulas, scope, active),
        getOwnPropertyDescriptor: (_target, property) => ({
          configurable: true,
          enumerable: true,
          value: resolveFormula(
            String(property),
            entry,
            formulas,
            scope,
            active,
          ),
        }),
      },
    );
  return Object.hasOwn(entry.frontmatter, first)
    ? entry.frontmatter[first]
    : undefined;
}

function resolveFormula(
  name: string,
  entry: ContentManifestEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: Readonly<Record<string, unknown>>,
  active: ReadonlySet<string>,
): unknown {
  const expression = formulas[name];
  if (!expression || active.has(name)) return undefined;
  return evaluateBasesExpression(
    expression,
    entry,
    formulas,
    scope,
    new Set([...active, name]),
  );
}

function fileValue(entry: ContentManifestEntry): Record<string, unknown> {
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

function readMember(value: unknown, property: string): unknown {
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

function evaluateBinary(
  expression: Extract<BasesExpression, { kind: "binary" }>,
  entry: ContentManifestEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: Readonly<Record<string, unknown>>,
  active: ReadonlySet<string>,
): unknown {
  const left = evaluateBasesExpression(
    expression.left,
    entry,
    formulas,
    scope,
    active,
  );
  if (expression.operator === "&&")
    return (
      left &&
      evaluateBasesExpression(expression.right, entry, formulas, scope, active)
    );
  if (expression.operator === "||")
    return (
      left ||
      evaluateBasesExpression(expression.right, entry, formulas, scope, active)
    );
  const right = evaluateBasesExpression(
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

function evaluateDateArithmetic(
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

function parseDuration(
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

function offsetDate(
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

function evaluateCall(
  expression: Extract<BasesExpression, { kind: "call" }>,
  entry: ContentManifestEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: Readonly<Record<string, unknown>>,
  active: ReadonlySet<string>,
): unknown {
  if (expression.callee.kind === "member") {
    const target = evaluateBasesExpression(
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
    evaluateBasesExpression(argument, entry, formulas, scope, active),
  );
  if (expression.callee.kind === "reference")
    return globalCall(expression.callee.path[0] ?? "", args);
  if (expression.callee.kind !== "member") return undefined;
  const target = evaluateBasesExpression(
    expression.callee.object,
    entry,
    formulas,
    scope,
    active,
  );
  return memberCall(target, expression.callee.property, args);
}

function globalCall(name: string, args: readonly unknown[]): unknown {
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

function memberCall(
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
    if (name === "format") return formatDate(target, String(args[0] ?? ""));
    if (name === "date") return startOfUtcDate(target);
    if (name === "time") return target.getTime();
  }
  if (typeof target === "string") {
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
  }
  if (Array.isArray(target)) {
    if (name === "contains")
      return target.some((value) =>
        scalarEquals(value, args[0] as BasesLiteral),
      );
    if (name === "join") return target.join(String(args[0] ?? ","));
    if (name === "containsAll")
      return args.every((value) =>
        target.some((item) => scalarEquals(item, value as BasesLiteral)),
      );
    if (name === "containsAny")
      return args.some((value) =>
        target.some((item) => scalarEquals(item, value as BasesLiteral)),
      );
    if (name === "unique") return [...new Set(target)];
    if (name === "flat") return target.flat();
    if (name === "sort") return [...target].sort();
    if (name === "reverse") return [...target].reverse();
    if (name === "slice")
      return target.slice(
        Number(args[0] ?? 0),
        args[1] === undefined ? undefined : Number(args[1]),
      );
    if (name === "isEmpty") return target.length === 0;
    if (name === "mean") return mean(target);
    if (name === "sum")
      return target.reduce((total, value) => total + Number(value), 0);
    if (name === "min") return Math.min(...target.map(Number));
    if (name === "max") return Math.max(...target.map(Number));
  }
  if (typeof target === "number") {
    if (name === "round") {
      const digits = Number(args[0] ?? 0);
      const factor = 10 ** digits;
      return Math.round(target * factor) / factor;
    }
    if (name === "floor") return Math.floor(target);
    if (name === "ceil") return Math.ceil(target);
    if (name === "abs") return Math.abs(target);
    if (name === "toFixed") return target.toFixed(Number(args[0] ?? 0));
  }
  if (target !== null && typeof target === "object") {
    if (name === "isEmpty") return Object.keys(target).length === 0;
    if (name === "keys") return Object.keys(target);
    if (name === "values") return Object.values(target);
  }
  return undefined;
}

function dateMember(date: Date, property: string): unknown {
  if (Number.isNaN(date.getTime())) return undefined;
  if (property === "year") return date.getUTCFullYear();
  if (property === "month") return date.getUTCMonth() + 1;
  if (property === "day") return date.getUTCDate();
  if (property === "hour") return date.getUTCHours();
  if (property === "minute") return date.getUTCMinutes();
  if (property === "second") return date.getUTCSeconds();
  if (property === "millisecond") return date.getUTCMilliseconds();
  if (property === "time") return date.getTime();
  if (property === "date") return startOfUtcDate(date);
  return undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "number" && Number.isFinite(value))
    return new Date(value);
  if (typeof value !== "string") return undefined;
  const source = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const [year, month, day] = source.split("-").map(Number);
    const date = new Date(Date.UTC(year, (month ?? 1) - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === (month ?? 1) - 1 &&
      date.getUTCDate() === day
      ? date
      : undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(source))
    return undefined;
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function duration(amount: unknown, unit: unknown): string | undefined {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return undefined;
  const normalized = String(unit ?? "")
    .trim()
    .toLowerCase();
  const units: Readonly<Record<string, string>> = {
    year: "years",
    years: "years",
    month: "months",
    months: "months",
    week: "weeks",
    weeks: "weeks",
    day: "days",
    days: "days",
    hour: "hours",
    hours: "hours",
    minute: "minutes",
    minutes: "minutes",
    second: "seconds",
    seconds: "seconds",
  };
  const suffix = units[normalized];
  return suffix ? `${amount} ${suffix}` : undefined;
}

function isType(value: unknown, expected: unknown): boolean {
  const type = String(expected ?? "").toLowerCase();
  if (type === "null") return value === null;
  if (type === "array" || type === "list") return Array.isArray(value);
  if (type === "date")
    return value instanceof Date && !Number.isNaN(value.getTime());
  if (type === "object")
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    );
  return typeof value === type;
}

function stringValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stringValue).join(", ");
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function startOfUtcDate(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function formatDate(value: Date, pattern: string): string | undefined {
  if (Number.isNaN(value.getTime())) return undefined;
  const fields: Readonly<Record<string, string>> = {
    yyyy: String(value.getUTCFullYear()).padStart(4, "0"),
    MM: String(value.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(value.getUTCDate()).padStart(2, "0"),
    HH: String(value.getUTCHours()).padStart(2, "0"),
    mm: String(value.getUTCMinutes()).padStart(2, "0"),
    ss: String(value.getUTCSeconds()).padStart(2, "0"),
  };
  return pattern.replace(
    /yyyy|MM|dd|HH|mm|ss/g,
    (token) => fields[token] ?? token,
  );
}

function titleCase(value: string): string {
  return value.replace(
    /(^|[\s_-])(\p{L})/gu,
    (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase()}`,
  );
}

function mean(values: readonly unknown[]): number {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length === 0
    ? Number.NaN
    : numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function evaluateHigherOrderCall(
  target: unknown,
  name: string,
  arguments_: readonly BasesExpression[],
  entry: ContentManifestEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: Readonly<Record<string, unknown>>,
  active: ReadonlySet<string>,
): { readonly handled: boolean; readonly value: unknown } {
  if (!Array.isArray(target) || !["map", "filter", "reduce"].includes(name)) {
    return { handled: false, value: undefined };
  }
  const expression = arguments_[0];
  if (!expression) return { handled: true, value: undefined };
  if (name === "map") {
    return {
      handled: true,
      value: target.map((value, index) =>
        evaluateBasesExpression(
          expression,
          entry,
          formulas,
          { ...scope, value, index },
          active,
        ),
      ),
    };
  }
  if (name === "filter") {
    return {
      handled: true,
      value: target.filter((value, index) =>
        Boolean(
          evaluateBasesExpression(
            expression,
            entry,
            formulas,
            { ...scope, value, index },
            active,
          ),
        ),
      ),
    };
  }
  let accumulator = arguments_[1]
    ? evaluateBasesExpression(arguments_[1], entry, formulas, scope, active)
    : target[0];
  const start = arguments_[1] ? 0 : 1;
  for (let index = start; index < target.length; index += 1) {
    accumulator = evaluateBasesExpression(
      expression,
      entry,
      formulas,
      {
        ...scope,
        acc: accumulator,
        value: target[index],
        index,
      },
      active,
    );
  }
  return { handled: true, value: accumulator };
}

/** Reads the entry value a filter reference points at. */
export function resolveValueRef(
  reference: BasesValueRef,
  entry: ContentManifestEntry,
): unknown {
  if (reference.source === "frontmatter") {
    return readFrontmatter(entry.frontmatter, reference.key);
  }
  return resolveBuiltin(reference.name, entry);
}

function readFrontmatter(
  frontmatter: Readonly<Record<string, unknown>>,
  key: string,
): unknown {
  if (Object.hasOwn(frontmatter, key)) return frontmatter[key];
  return key.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return Object.hasOwn(value, part)
      ? (value as Readonly<Record<string, unknown>>)[part]
      : undefined;
  }, frontmatter);
}

function resolveBuiltin(
  name: BasesBuiltinValue,
  entry: ContentManifestEntry,
): unknown {
  switch (name) {
    case "file.name":
      return `${entry.slug.split("/").at(-1) ?? entry.slug}.md`;
    case "file.path":
      return `${entry.slug}.md`;
    case "file.slug":
      return entry.slug;
    case "file.folder":
      return folderOf(entry.slug);
    case "file.title":
      return entry.title;
    case "file.link":
    case "file.permalink":
      return entry.permalink;
    case "file.tags":
      return entry.tags;
    case "file.ext":
      return "md";
    case "file.size":
      return entry.file?.size;
    case "file.mtime":
      return entry.file?.mtime;
    case "file.ctime":
      return entry.file?.ctime;
    default:
      return undefined;
  }
}

function hasTag(tags: readonly string[], tag: string): boolean {
  const target = tag.trim().replace(/^#/, "").toLowerCase();
  if (target === "") return false;
  return tags.some((value) => {
    const normalized = value.toLowerCase();
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

function inFolder(slug: string, folder: string): boolean {
  const target = folder.trim().replace(/^\/+|\/+$/g, "");
  if (target === "") return true;
  return slug === target || slug.startsWith(`${target}/`);
}

function hasLink(links: readonly ContentLink[], link: string): boolean {
  const target = normalizeLink(link);
  if (target === "") return false;
  return links.some((candidate) => {
    if (candidate.slug !== null && candidate.slug.toLowerCase() === target) {
      return true;
    }
    const raw = normalizeLink(candidate.raw);
    return raw === target || baseName(raw) === baseName(target);
  });
}

function normalizeLink(value: string): string {
  return value
    .trim()
    .replace(/^\[\[|\]\]$/g, "")
    .split("|")[0]
    .split("#")[0]
    .replace(/\.md$/i, "")
    .replace(/^\.?\//, "")
    .toLowerCase();
}

function baseName(value: string): string {
  const parts = value.split("/");
  return parts[parts.length - 1] ?? value;
}

function folderOf(slug: string): string {
  const index = slug.lastIndexOf("/");
  return index === -1 ? "" : slug.slice(0, index);
}

function compare(
  actual: unknown,
  operator: BasesOperator,
  expected: BasesLiteral,
): boolean {
  if (operator === "contains") return containsValue(actual, expected);

  if (operator === "==" || operator === "!=") {
    const equal = equalsAny(actual, expected);
    return operator === "==" ? equal : !equal;
  }

  const order = compareOrder(actual, expected);
  if (order === null) return false;
  switch (operator) {
    case ">":
      return order > 0;
    case "<":
      return order < 0;
    case ">=":
      return order >= 0;
    case "<=":
      return order <= 0;
    default:
      return false;
  }
}

function equalsAny(actual: unknown, expected: BasesLiteral): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) => scalarEquals(item, expected));
  }
  return scalarEquals(actual, expected);
}

function scalarEquals(actual: unknown, expected: BasesLiteral): boolean {
  if (actual === undefined || actual === null) return expected === null;
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.toLowerCase() === expected.toLowerCase();
  }
  if (actual instanceof Date) {
    const time = toComparableNumber(expected);
    return time !== null && actual.getTime() === time;
  }
  return actual === expected;
}

function containsValue(actual: unknown, expected: BasesLiteral): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) =>
      typeof item === "string" && typeof expected === "string"
        ? item.toLowerCase().includes(expected.toLowerCase())
        : scalarEquals(item, expected),
    );
  }
  if (typeof actual === "string") {
    return actual.toLowerCase().includes(String(expected ?? "").toLowerCase());
  }
  return false;
}

function compareOrder(actual: unknown, expected: BasesLiteral): number | null {
  if (actual === undefined || actual === null) return null;

  const left = toComparableNumber(actual);
  const right = toComparableNumber(expected);
  if (left !== null && right !== null) {
    return Math.sign(left - right);
  }

  if (actual instanceof Date) return null;
  return Math.sign(String(actual).localeCompare(String(expected ?? ""), "en"));
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    const time = Date.parse(trimmed);
    if (!Number.isNaN(time)) return time;
  }
  return null;
}
