import { stripHash } from "./evaluate_util.js";
import { toNumber } from "./evaluate_value.js";
import type { DataviewComparisonOperator } from "./types.js";

export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return Number.isFinite(value.getTime());
  return true;
}

export function compareValues(
  operator: DataviewComparisonOperator,
  left: unknown,
  right: unknown,
): boolean {
  if (operator === "=") return looseEquals(left, right);
  if (operator === "!=") return !looseEquals(left, right);

  const order = compareOrder(left, right);
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
  }
}

export function looseEquals(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => looseEquals(item, right[index]));
  }

  if (
    left === null ||
    left === undefined ||
    right === null ||
    right === undefined
  ) {
    return (left ?? null) === (right ?? null);
  }

  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;

  if (typeof leftValue === "boolean" || typeof rightValue === "boolean") {
    return leftValue === rightValue;
  }
  const leftNumber = toNumber(leftValue);
  const rightNumber = toNumber(rightValue);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber === rightNumber;
  }
  return String(leftValue).toLowerCase() === String(rightValue).toLowerCase();
}

export function compareOrder(left: unknown, right: unknown): number | null {
  const leftValue = normalizeComparable(left);
  const rightValue = normalizeComparable(right);
  if (leftValue === null || rightValue === null) return null;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  const leftText = String(leftValue).toLowerCase();
  const rightText = String(rightValue).toLowerCase();
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

export function normalizeComparable(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    if (/^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(trimmed)) {
      const time = Date.parse(trimmed);
      if (!Number.isNaN(time)) return time;
    }
    return value;
  }
  return String(value);
}

export function arithmetic(
  operator: "+" | "-" | "*" | "/" | "%",
  left: unknown,
  right: unknown,
): unknown {
  if (
    operator === "+" &&
    (typeof left === "string" || typeof right === "string")
  ) {
    return `${String(left ?? "")}${String(right ?? "")}`;
  }

  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber === null || rightNumber === null) return null;

  switch (operator) {
    case "+":
      return leftNumber + rightNumber;
    case "-":
      return leftNumber - rightNumber;
    case "*":
      return leftNumber * rightNumber;
    case "/":
      return rightNumber === 0 ? null : leftNumber / rightNumber;
    case "%":
      return rightNumber === 0 ? null : leftNumber % rightNumber;
  }
}

export function negate(value: unknown): unknown {
  const numeric = toNumber(value);
  return numeric === null ? null : -numeric;
}

export function containsValue(container: unknown, expected: unknown): boolean {
  if (container === null || container === undefined) return false;

  if (Array.isArray(container)) {
    return container.some((item) => looseTagEquals(item, expected));
  }
  if (typeof container === "string") {
    if (expected === null || expected === undefined) return false;
    return container.toLowerCase().includes(String(expected).toLowerCase());
  }
  return false;
}

export function looseTagEquals(left: unknown, right: unknown): boolean {
  if (typeof left === "string" && typeof right === "string") {
    return stripHash(left).toLowerCase() === stripHash(right).toLowerCase();
  }
  return looseEquals(left, right);
}
