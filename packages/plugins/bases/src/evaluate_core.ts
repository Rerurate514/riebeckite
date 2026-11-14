import {
  type BasesEntry,
  compare,
  hasLink,
  hasTag,
  inFolder,
  resolveValueRef,
} from "./conditions.js";
import { evaluateCall } from "./evaluate_calls.js";
import { setExpressionEvaluator } from "./evaluate_delegate.js";
import { evaluateBinary, fileValue, readMember } from "./evaluate_values.js";
import type { BasesCondition, BasesExpression } from "./types.js";

export const MAX_EVALUATION_STEPS = 10_000;

export const MAX_EVALUATION_DEPTH = 128;

export const EVALUATION_BUDGET = Symbol("bases-evaluation-budget");

export type EvaluationBudget = { remaining: number; depth: number };

export type EvaluationScope = {
  readonly [key: string]: unknown;
  [EVALUATION_BUDGET]?: EvaluationBudget;
};

export class BasesEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BasesEvaluationError";
  }
}

export function matchesCondition(
  condition: BasesCondition,
  entry: BasesEntry,
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
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>> = {},
  scope: EvaluationScope = {},
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

export function evaluationBudget(scope: EvaluationScope): EvaluationBudget {
  const existing = scope[EVALUATION_BUDGET];
  if (existing) return existing;
  const budget: EvaluationBudget = {
    remaining: MAX_EVALUATION_STEPS,
    depth: 0,
  };
  scope[EVALUATION_BUDGET] = budget;
  return budget;
}

export function resolvePath(
  path: readonly string[],
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
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

export function resolveFormula(
  name: string,
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
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

setExpressionEvaluator(evaluateBasesExpression);
