import type { BasesEntry } from "./conditions.js";
import type { EvaluationScope } from "./evaluate_core.js";
import { evaluateNested } from "./evaluate_delegate.js";
import type { BasesExpression } from "./types.js";

export function startOfUtcDate(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function formatDate(value: Date, pattern: string): string | undefined {
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

export function titleCase(value: string): string {
  return value.replace(
    /(^|[\s_-])(\p{L})/gu,
    (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase()}`,
  );
}

export function mean(values: readonly unknown[]): number {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length === 0
    ? Number.NaN
    : numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

export function evaluateHigherOrderCall(
  target: unknown,
  name: string,
  arguments_: readonly BasesExpression[],
  entry: BasesEntry,
  formulas: Readonly<Record<string, BasesExpression>>,
  scope: EvaluationScope,
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
        evaluateNested(
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
          evaluateNested(
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
    ? evaluateNested(arguments_[1], entry, formulas, scope, active)
    : target[0];
  const start = arguments_[1] ? 0 : 1;
  for (let index = start; index < target.length; index += 1) {
    accumulator = evaluateNested(
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
