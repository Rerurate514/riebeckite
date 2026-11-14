import { readDataviewField } from "./evaluate_fields.js";
import {
  arithmetic,
  compareOrder,
  compareValues,
  containsValue,
  isTruthy,
  negate,
} from "./evaluate_logic.js";
import {
  DataviewEvaluationError,
  type DataviewScope,
} from "./evaluate_types.js";
import {
  aggregate,
  formatDateValue,
  lengthOf,
  numericValues,
  roundValue,
  textStartsWith,
  toDate,
  toNumber,
} from "./evaluate_value.js";
import type { DataviewExpression } from "./types.js";

export function evaluateDataviewExpression(
  expression: DataviewExpression,
  scope: DataviewScope,
): unknown {
  switch (expression.kind) {
    case "literal":
      return expression.value;
    case "list":
      return expression.items.map((item) =>
        evaluateDataviewExpression(item, scope),
      );
    case "field":
      return readDataviewField(
        scope.entry,
        expression.path,
        scope.manifest,
        scope.fields,
        scope.task,
        scope.buildTime,
      );
    case "not":
      return !isTruthy(evaluateDataviewExpression(expression.operand, scope));
    case "and":
      return (
        isTruthy(evaluateDataviewExpression(expression.left, scope)) &&
        isTruthy(evaluateDataviewExpression(expression.right, scope))
      );
    case "or":
      return (
        isTruthy(evaluateDataviewExpression(expression.left, scope)) ||
        isTruthy(evaluateDataviewExpression(expression.right, scope))
      );
    case "unary":
      return negate(evaluateDataviewExpression(expression.operand, scope));
    case "arithmetic":
      return arithmetic(
        expression.operator,
        evaluateDataviewExpression(expression.left, scope),
        evaluateDataviewExpression(expression.right, scope),
      );
    case "compare":
      return compareValues(
        expression.operator,
        evaluateDataviewExpression(expression.left, scope),
        evaluateDataviewExpression(expression.right, scope),
      );
    case "call":
      return callFunction(expression, scope);
    default:
      return undefined;
  }
}

export function callFunction(
  expression: Extract<DataviewExpression, { kind: "call" }>,
  scope: DataviewScope,
): unknown {
  const args = expression.args.map((arg) =>
    evaluateDataviewExpression(arg, scope),
  );

  switch (expression.name) {
    case "contains":
      return containsValue(args[0], args[1]);
    case "date":
      return args[0] === undefined ? args[0] : toDate(args[0]);
    case "dateformat":
      return formatDateValue(args[0], args[1]);
    case "number": {
      const numeric = toNumber(args[0]);
      return numeric === null ? null : numeric;
    }
    case "string":
      return args[0] === undefined || args[0] === null ? null : String(args[0]);
    case "length":
      return lengthOf(args[0]);
    case "lower":
      return typeof args[0] === "string" ? args[0].toLowerCase() : null;
    case "upper":
      return typeof args[0] === "string" ? args[0].toUpperCase() : null;
    case "trim":
      return typeof args[0] === "string" ? args[0].trim() : null;
    case "round":
      return roundValue(args[0], args[1], Math.round);
    case "floor":
      return roundValue(args[0], args[1], Math.floor);
    case "ceil":
      return roundValue(args[0], args[1], Math.ceil);
    case "min":
      return aggregate(args, (values) => Math.min(...values));
    case "max":
      return aggregate(args, (values) => Math.max(...values));
    case "sum":
      return aggregate(args, (values) => values.reduce((a, b) => a + b, 0));
    case "average":
    case "mean": {
      const values = numericValues(args);
      if (values.length === 0) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
    case "startswith":
      return textStartsWith(args[0], args[1], true);
    case "endswith":
      return textStartsWith(args[0], args[1], false);
    case "join":
      return Array.isArray(args[0])
        ? args[0].map((item) => String(item ?? "")).join(String(args[1] ?? ""))
        : null;
    case "reverse":
      return Array.isArray(args[0]) ? [...args[0]].reverse() : null;
    case "sort": {
      if (!Array.isArray(args[0])) return null;
      return [...args[0]].sort(
        (left, right) =>
          (compareOrder(left, right) ?? 0) * (args[1] === "desc" ? -1 : 1),
      );
    }
    case "default":
      return args[0] ?? args[1] ?? null;
    case "nonnull":
      return args.filter((value) => value !== null && value !== undefined);
    case "choice":
      return isTruthy(args[0]) ? (args[1] ?? null) : (args[2] ?? null);
    default:
      throw new DataviewEvaluationError(
        `unsupported function \`${expression.name}()\`.`,
      );
  }
}
