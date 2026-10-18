import type { ContentLink, ContentManifestEntry } from "@riebeckite/core";
import type {
  BasesBuiltinValue,
  BasesCondition,
  BasesExpression,
  BasesLiteral,
  BasesOperator,
  BasesValueRef,
} from "./types.js";

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
    size: undefined,
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
  if (name === "list") return Array.isArray(args[0]) ? args[0] : [args[0]];
  if (name === "number") return Number(args[0]);
  if (name === "length")
    return Array.isArray(args[0]) || typeof args[0] === "string"
      ? args[0].length
      : 0;
  if (name === "min") return Math.min(...args.map(Number));
  if (name === "max") return Math.max(...args.map(Number));
  if (name === "date") {
    const date = new Date(String(args[0] ?? ""));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
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
  return undefined;
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
  if (!expression || target.length > 10_000)
    return { handled: true, value: undefined };
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
    case "file.mtime":
    case "file.ctime":
      return undefined;
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
