import type { BasesEntry } from "./conditions.js";
import type { EvaluationScope } from "./evaluate_core.js";
import type { BasesExpression } from "./types.js";

export type ExpressionEvaluator = (
  expression: BasesExpression,
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
  active: ReadonlySet<string>,
) => unknown;

let evaluator: ExpressionEvaluator | undefined;

export function setExpressionEvaluator(next: ExpressionEvaluator): void {
  evaluator = next;
}

export function evaluateNested(
  expression: BasesExpression,
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
  active: ReadonlySet<string>,
): unknown {
  if (!evaluator) {
    throw new Error("Bases expression evaluator is not initialized.");
  }
  return evaluator(expression, entry, formulas, scope, active);
}
