import { isEmoji } from "./emoji.js";
import type { IconicRule } from "./types.js";

export type IconicResolution = {
  readonly icon?: string;
  readonly color?: string;
  readonly rule?: string;
};

export type IconicDiagnosticReporter = (
  rule: IconicRule,
  message: string,
) => void;

export const BOOLEAN_OPERATORS = new Set(["isTrue", "isFalse"]);

export const ARRAY_OPERATORS = new Set([
  "includes",
  "allAre",
  "allContain",
  "allStartWith",
  "allEndWith",
  "allMatch",
  "anyContain",
  "anyStartWith",
  "anyEndWith",
  "anyMatch",
  "noneContain",
  "noneStartWith",
  "noneEndWith",
  "noneMatch",
  "countIs",
  "countIsLess",
  "countIsMore",
]);

export const NUMBER_OPERATORS = new Set([
  "equals",
  "isLess",
  "isMore",
  "isDivisible",
]);

export const STRING_OPERATORS = new Set([
  "is",
  "contains",
  "startsWith",
  "endsWith",
  "matches",
  "hasValue",
  "hasProperty",
]);

export function resolveIconicReference(icon: string): string {
  if (isEmoji(icon)) return `emoji:${icon}`;
  if (/^lucide-/.test(icon)) return `lucide:${icon.slice(7)}`;
  if (icon.includes(":")) {
    const [namespace, ...rest] = icon.split(":");
    if (namespace === "lucide" || namespace === "emoji") {
      return `${namespace}:${rest.join(":")}`;
    }
  }
  return `lucide:${icon}`;
}

export type SourceValue =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "array"; readonly value: readonly string[] }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "date"; readonly value: Date }
  | {
      readonly kind: "property";
      readonly value: unknown;
      readonly exists: boolean;
    };

export function applyToNumber(
  value: number,
  operator: string,
  expected: string,
): boolean | undefined {
  const number = Number(expected);
  if (!Number.isFinite(number)) return false;
  switch (operator) {
    case "is":
    case "equals":
      return value === number;
    case "isLess":
      return value < number;
    case "isMore":
      return value > number;
    case "isDivisible":
      return number !== 0 && value % number === 0;
    default:
      return undefined;
  }
}

export function applyToBoolean(
  value: boolean,
  operator: string,
  expected: string,
): boolean | undefined {
  if (operator !== "is") return undefined;
  return value === (expected === "true");
}

export function applyToDate(
  value: Date,
  operator: string,
  expected: string,
): boolean | undefined {
  if (!["is", "isLess", "isMore", "equals"].includes(operator)) {
    return undefined;
  }
  const date = new Date(expected);
  if (Number.isNaN(date.getTime())) return false;
  const time = value.getTime();
  if (operator === "isLess") return time < date.getTime();
  if (operator === "isMore") return time > date.getTime();
  return time === date.getTime();
}
