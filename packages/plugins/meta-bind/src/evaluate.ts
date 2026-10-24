import type {
  MetaBindExpression,
  MetaBindTarget,
  MetaBindValue,
} from "./types.js";

const MAX_DEPTH = 64;
const MAX_STEPS = 1_024;

export function evaluateMetaBindExpression(
  expression: MetaBindExpression,
  state: Readonly<Record<string, unknown>>,
): MetaBindValue {
  const context = { steps: 0, exhausted: false };
  return evaluate(expression, state, context, 0);
}

export function readMetaBindTarget(
  state: Readonly<Record<string, unknown>>,
  target: MetaBindTarget,
): MetaBindValue {
  let value: unknown = state;
  for (const part of target.path) {
    if (!isRecord(value) || !Object.hasOwn(value, part)) return null;
    value = value[part];
  }
  return isValue(value) ? value : null;
}

function evaluate(
  expression: MetaBindExpression,
  state: Readonly<Record<string, unknown>>,
  context: { steps: number; exhausted: boolean },
  depth: number,
): MetaBindValue {
  if (depth > MAX_DEPTH || ++context.steps > MAX_STEPS) {
    context.exhausted = true;
    return null;
  }
  if (expression.kind === "literal") return expression.value;
  if (expression.kind === "reference")
    return readMetaBindTarget(state, expression.target);
  if (expression.kind === "unary") {
    const value = evaluate(expression.value, state, context, depth + 1);
    if (context.exhausted) return null;
    return expression.operator === "!"
      ? !truthy(value)
      : finiteNumber(-Number(value));
  }
  const left = evaluate(expression.left, state, context, depth + 1);
  const right = evaluate(expression.right, state, context, depth + 1);
  if (context.exhausted) return null;
  switch (expression.operator) {
    case "||":
      return truthy(left) ? left : right;
    case "&&":
      return truthy(left) ? right : left;
    case "==":
      return left === right;
    case "===":
      return left === right;
    case "!=":
      return left !== right;
    case "!==":
      return left !== right;
    case ">":
      return compare(left, right, (a, b) => a > b);
    case ">=":
      return compare(left, right, (a, b) => a >= b);
    case "<":
      return compare(left, right, (a, b) => a < b);
    case "<=":
      return compare(left, right, (a, b) => a <= b);
    case "+":
      return typeof left === "string" || typeof right === "string"
        ? `${left ?? ""}${right ?? ""}`
        : finiteNumber(Number(left) + Number(right));
    case "-":
      return finiteNumber(Number(left) - Number(right));
    case "*":
      return finiteNumber(Number(left) * Number(right));
    case "/":
      return finiteNumber(Number(left) / Number(right));
    case "%":
      return finiteNumber(Number(left) % Number(right));
    default:
      return null;
  }
}

function compare(
  left: MetaBindValue,
  right: MetaBindValue,
  predicate: (left: number, right: number) => boolean,
): boolean {
  return predicate(Number(left), Number(right));
}

function finiteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function truthy(value: MetaBindValue): boolean {
  return value !== null && value !== false && value !== 0 && value !== "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isValue(value: unknown): value is MetaBindValue {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}
