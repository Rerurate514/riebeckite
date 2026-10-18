import type { OutputDependency } from "@riebeckite/core";
import type { BasesCondition, BasesExpression, BasesSpec } from "./types.js";

export function analyzeBasesDependencies(spec: BasesSpec): OutputDependency {
  const properties = new Set<string>();
  const active = new Set<string>();
  let unknown = false;

  const analyzeFormula = (name: string): void => {
    if (active.has(name)) {
      unknown = true;
      return;
    }
    const formula = spec.formulas[name];
    if (!formula) {
      unknown = true;
      return;
    }
    active.add(name);
    analyzeExpression(formula, properties, analyzeFormula, () => {
      unknown = true;
    });
    active.delete(name);
  };

  analyzeCondition(spec.filter, properties, analyzeFormula, () => {
    unknown = true;
  });
  for (const view of spec.views) {
    analyzeCondition(view.filter, properties, analyzeFormula, () => {
      unknown = true;
    });
    for (const property of [
      ...view.columns,
      ...(view.sort?.map((item) => item.property) ?? []),
      ...(view.groupBy ? [view.groupBy.property] : []),
      ...Object.keys(view.summaries ?? {}),
    ]) {
      analyzeProperty(property, properties, analyzeFormula, () => {
        unknown = true;
      });
    }
  }
  return {
    type: "content-query",
    properties: [...properties].sort(),
    ...(unknown ? { unknown: true } : {}),
  };
}

function analyzeCondition(
  condition: BasesCondition | undefined,
  properties: Set<string>,
  formula: (name: string) => void,
  markUnknown: () => void,
): void {
  if (!condition) return;
  switch (condition.kind) {
    case "and":
    case "or":
      for (const child of condition.conditions)
        analyzeCondition(child, properties, formula, markUnknown);
      return;
    case "not":
      analyzeCondition(condition.condition, properties, formula, markUnknown);
      return;
    case "hasTag":
      properties.add("file.tags");
      return;
    case "inFolder":
      properties.add("file.folder");
      return;
    case "hasLink":
      properties.add("file.links");
      return;
    case "compare":
      properties.add(
        condition.left.source === "builtin"
          ? condition.left.name
          : condition.left.key,
      );
      return;
    case "expression":
      analyzeExpression(condition.expression, properties, formula, markUnknown);
      return;
  }
}

function analyzeProperty(
  property: string,
  properties: Set<string>,
  formula: (name: string) => void,
  markUnknown: () => void,
): void {
  if (property.startsWith("formula.")) {
    formula(property.slice(8));
    return;
  }
  if (property === "file" || property === "note") {
    markUnknown();
    return;
  }
  if (property.startsWith("note.")) properties.add(property.slice(5));
  else if (property.startsWith("file.frontmatter."))
    properties.add(property.slice(17));
  else properties.add(property);
}

function analyzeExpression(
  expression: BasesExpression,
  properties: Set<string>,
  formula: (name: string) => void,
  markUnknown: () => void,
): void {
  switch (expression.kind) {
    case "literal":
      return;
    case "reference":
      analyzeReference(expression.path, properties, formula, markUnknown);
      return;
    case "array":
      for (const value of expression.values)
        analyzeExpression(value, properties, formula, markUnknown);
      return;
    case "unary":
      analyzeExpression(expression.value, properties, formula, markUnknown);
      return;
    case "binary":
      analyzeExpression(expression.left, properties, formula, markUnknown);
      analyzeExpression(expression.right, properties, formula, markUnknown);
      return;
    case "call":
      if (isFilePredicate(expression.callee, "hasTag")) {
        properties.add("file.tags");
      } else if (isFilePredicate(expression.callee, "hasLink")) {
        properties.add("file.links");
      } else if (isFilePredicate(expression.callee, "inFolder")) {
        properties.add("file.folder");
      } else if (isFilePredicate(expression.callee, "hasProperty")) {
        const property = literalString(expression.arguments[0]);
        if (property === undefined) markUnknown();
        else properties.add(property);
      } else if (expression.callee.kind === "member")
        analyzeExpression(
          expression.callee.object,
          properties,
          formula,
          markUnknown,
        );
      else
        analyzeExpression(expression.callee, properties, formula, markUnknown);
      for (const argument of expression.arguments)
        analyzeExpression(argument, properties, formula, markUnknown);
      return;
    case "member":
      analyzeMember(expression, properties, formula, markUnknown);
      return;
    case "index":
      analyzeExpression(expression.object, properties, formula, markUnknown);
      analyzeExpression(expression.index, properties, formula, markUnknown);
      markUnknown();
      return;
  }
}

function literalString(
  expression: BasesExpression | undefined,
): string | undefined {
  return expression?.kind === "literal" && typeof expression.value === "string"
    ? expression.value
    : undefined;
}

function isFilePredicate(
  expression: BasesExpression,
  predicate: string,
): boolean {
  const path = expressionPath(expression);
  return path?.length === 2 && path[0] === "file" && path[1] === predicate;
}

function analyzeMember(
  expression: Extract<BasesExpression, { kind: "member" }>,
  properties: Set<string>,
  formula: (name: string) => void,
  markUnknown: () => void,
): void {
  const path = expressionPath(expression);
  if (path) {
    analyzeReference(path, properties, formula, markUnknown);
    return;
  }
  analyzeExpression(expression.object, properties, formula, markUnknown);
}

function expressionPath(
  expression: BasesExpression,
): readonly string[] | undefined {
  if (expression.kind === "reference") return expression.path;
  if (expression.kind !== "member") return undefined;
  const parent = expressionPath(expression.object);
  return parent ? [...parent, expression.property] : undefined;
}

function analyzeReference(
  path: readonly string[],
  properties: Set<string>,
  formula: (name: string) => void,
  markUnknown: () => void,
): void {
  const [first, ...rest] = path;
  if (!first || first === "value" || first === "index" || first === "acc")
    return;
  if (first === "formula") {
    if (rest.length !== 1) markUnknown();
    else formula(rest[0] ?? "");
    return;
  }
  if (first === "file") {
    if (rest.length === 0) markUnknown();
    else if (rest[0] === "frontmatter") {
      if (rest.length === 1) markUnknown();
      else properties.add(rest.slice(1).join("."));
    } else properties.add(`file.${rest.join(".")}`);
    return;
  }
  if (first === "note") {
    if (rest.length === 0) markUnknown();
    else properties.add(rest.join("."));
    return;
  }
  properties.add(path.join("."));
}
