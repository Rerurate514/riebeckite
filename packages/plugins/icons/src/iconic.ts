import { normalizeColor } from "./color.js";
import {
  ARRAY_OPERATORS,
  applyToBoolean,
  applyToDate,
  applyToNumber,
  BOOLEAN_OPERATORS,
  type IconicDiagnosticReporter,
  type IconicResolution,
  NUMBER_OPERATORS,
  type SourceValue,
  STRING_OPERATORS,
} from "./iconic_helpers.js";
import type {
  IconicData,
  IconicRule,
  IconicValue,
  IconTarget,
} from "./types.js";

export function resolveIconic(
  data: IconicData,
  target: IconTarget,
  options: {
    readonly colors: boolean;
    readonly report: IconicDiagnosticReporter;
  },
): IconicResolution | undefined {
  const manual = data.fileIcons[target.path];
  const rules = target.kind === "folder" ? data.folderRules : data.fileRules;
  const rule = rules.find(
    (candidate) =>
      candidate.enabled !== false &&
      (candidate.conditions?.length ?? 0) > 0 &&
      matchesRule(candidate, target, manual, options.report),
  );

  const icon = rule?.icon ?? manual?.icon;
  const rawColor = rule?.color ?? manual?.color;
  if (!icon && !rawColor) return undefined;
  const color = options.colors
    ? normalizeColor(rawColor, { iconicNames: true })
    : undefined;
  return {
    ...(icon ? { icon } : {}),
    ...(color ? { color } : {}),
    ...(rule ? { rule: rule.name ?? rule.id } : {}),
  };
}

function matchesRule(
  rule: IconicRule,
  target: IconTarget,
  manual: IconicValue | undefined,
  report: IconicDiagnosticReporter,
): boolean {
  let unsupported = false;
  const results: boolean[] = [];
  for (const condition of rule.conditions ?? []) {
    const result = evaluateCondition(condition, target, manual);
    if (result === undefined) {
      unsupported = true;
      results.push(false);
    } else {
      results.push(result);
    }
  }
  if (unsupported) {
    report(rule, "uses a condition that cannot be evaluated in a static build");
  }
  const match = rule.match ?? "all";
  if (match === "any") return results.some(Boolean);
  if (match === "none") return !results.some(Boolean);
  return results.length > 0 && results.every(Boolean);
}

function evaluateCondition(
  condition: { source?: string; operator?: string; value?: string },
  target: IconTarget,
  manual: IconicValue | undefined,
): boolean | undefined {
  const source = condition.source?.trim();
  const operator = condition.operator?.trim();
  if (!source || !operator) return false;

  const negate = operator.startsWith("!");
  const op = negate ? operator.slice(1) : operator;
  const rawValue = condition.value ?? "";

  const resolved = readSource(source, target, manual);
  if (resolved === undefined) return undefined;
  const result = applyOperator(resolved, op, rawValue);
  if (result === undefined) return undefined;
  return negate ? !result : result;
}

function readSource(
  source: string,
  target: IconTarget,
  manual: IconicValue | undefined,
): SourceValue | undefined {
  if (source === "clock" || source === "headings" || source === "bookmarks") {
    return undefined;
  }
  if (source === "created" || source === "modified") {
    const value = source === "created" ? target.created : target.modified;
    return value ? { kind: "date", value } : undefined;
  }
  if (source.startsWith("property:")) {
    const key = source.slice("property:".length).trim().toLowerCase();
    const frontmatter = target.frontmatter ?? {};
    const found = Object.entries(frontmatter).find(
      ([candidate]) => candidate.toLowerCase() === key,
    );
    return {
      kind: "property",
      value: found?.[1],
      exists: found !== undefined,
    };
  }

  const path = target.path;
  switch (source) {
    case "icon":
      return { kind: "string", value: manual?.icon ?? "" };
    case "color":
      return { kind: "string", value: manual?.color ?? "" };
    case "name": {
      const name = path.split("/").pop() ?? path;
      return {
        kind: "string",
        value: name.replace(/\.[^.]+$/, ""),
      };
    }
    case "filename":
      return { kind: "string", value: path.split("/").pop() ?? path };
    case "extension": {
      const name = path.split("/").pop() ?? path;
      const dot = name.lastIndexOf(".");
      return { kind: "string", value: dot > 0 ? name.slice(dot + 1) : "" };
    }
    case "tree":
      return { kind: "string", value: path.split("/").slice(0, -1).join("/") };
    case "path":
      return { kind: "string", value: path };
    case "tags":
      return { kind: "array", value: target.tags ?? [] };
    case "links":
      return { kind: "array", value: target.links ?? [] };
    case "embeds":
      return { kind: "array", value: target.embeds ?? [] };
    default:
      return undefined;
  }
}

function applyOperator(
  source: SourceValue,
  operator: string,
  expected: string,
): boolean | undefined {
  if (BOOLEAN_OPERATORS.has(operator)) {
    if (source.kind !== "boolean" && source.kind !== "property")
      return undefined;
    const value =
      source.kind === "boolean" ? source.value : toBoolean(source.value);
    return operator === "isTrue" ? value : !value;
  }

  if (operator === "hasProperty") {
    return source.kind === "property" ? source.exists : undefined;
  }

  if (source.kind === "property") {
    if (Array.isArray(source.value)) {
      return applyToArray(
        source.value.map((item) => String(item)),
        operator,
        expected,
      );
    }
    if (typeof source.value === "number") {
      return applyToNumber(source.value, operator, expected);
    }
    if (typeof source.value === "boolean") {
      return applyToBoolean(source.value, operator, expected);
    }
    return applyToString(String(source.value ?? ""), operator, expected);
  }

  if (source.kind === "array") {
    return applyToArray(source.value, operator, expected);
  }
  if (source.kind === "date") {
    return applyToDate(source.value, operator, expected);
  }
  if (source.kind === "boolean") {
    return applyToBoolean(source.value, operator, expected);
  }
  return applyToString(source.value, operator, expected);
}

function applyToString(
  value: string,
  operator: string,
  expected: string,
): boolean | undefined {
  switch (operator) {
    case "is":
      return value === expected;
    case "contains":
      return value.includes(expected);
    case "startsWith":
      return value.startsWith(expected);
    case "endsWith":
      return value.endsWith(expected);
    case "matches":
      return safeRegex(expected).test(value);
    case "hasValue":
      return value.length > 0;
    default:
      return ARRAY_OPERATORS.has(operator) || NUMBER_OPERATORS.has(operator)
        ? false
        : undefined;
  }
}

function applyToArray(
  value: readonly string[],
  operator: string,
  expected: string,
): boolean | undefined {
  if (!ARRAY_OPERATORS.has(operator)) {
    if (STRING_OPERATORS.has(operator))
      return applyToString(value.join(","), operator, expected);
    return undefined;
  }
  switch (operator) {
    case "includes":
      return value.includes(expected);
    case "allAre":
      return value.length > 0 && value.every((item) => item === expected);
    case "allContain":
      return value.length > 0 && value.every((item) => item.includes(expected));
    case "allStartWith":
      return (
        value.length > 0 && value.every((item) => item.startsWith(expected))
      );
    case "allEndWith":
      return value.length > 0 && value.every((item) => item.endsWith(expected));
    case "allMatch": {
      const regex = safeRegex(expected);
      return value.length > 0 && value.every((item) => regex.test(item));
    }
    case "anyContain":
      return value.some((item) => item.includes(expected));
    case "anyStartWith":
      return value.some((item) => item.startsWith(expected));
    case "anyEndWith":
      return value.some((item) => item.endsWith(expected));
    case "anyMatch": {
      const regex = safeRegex(expected);
      return value.some((item) => regex.test(item));
    }
    case "noneContain":
      return !value.some((item) => item.includes(expected));
    case "noneStartWith":
      return !value.some((item) => item.startsWith(expected));
    case "noneEndWith":
      return !value.some((item) => item.endsWith(expected));
    case "noneMatch": {
      const regex = safeRegex(expected);
      return !value.some((item) => regex.test(item));
    }
    case "countIs":
      return value.length === Number(expected);
    case "countIsLess":
      return value.length < Number(expected);
    case "countIsMore":
      return value.length > Number(expected);
    default:
      return undefined;
  }
}

function safeRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern.length > 512 ? "" : pattern);
  } catch {
    return /$a/;
  }
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

export type { IconicDiagnosticReporter } from "./iconic_helpers.js";
export { resolveIconicReference } from "./iconic_helpers.js";
