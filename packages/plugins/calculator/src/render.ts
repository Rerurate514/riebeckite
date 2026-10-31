import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { evaluateExpression, formatExpressionValue } from "./expression.js";

export const DEFAULT_CALCULATOR_CLASS = "rb-calculator";
export const DEFAULT_CALCULATOR_LANGUAGE = "calc";

export function renderCalculator(
  expression: string,
  className = DEFAULT_CALCULATOR_CLASS,
): string {
  const source = expression.trim();
  const result = evaluateExpression(source);
  const expressionHtml = `<p class="${escapeHtmlAttribute(className)}__expression"><code>${escapeHtml(source)}</code></p>`;

  if (result.ok === false) {
    return `<div class="${escapeHtmlAttribute(className)} ${escapeHtmlAttribute(`${className}--invalid`)}" role="status">${expressionHtml}<p class="${escapeHtmlAttribute(className)}__error">Invalid expression: ${escapeHtml(result.reason)}</p></div>`;
  }

  const value = escapeHtml(formatExpressionValue(result.value));
  return [
    `<div class="${escapeHtmlAttribute(className)}" data-calculator data-calculator-expression="${escapeHtmlAttribute(source)}">`,
    expressionHtml,
    `<div class="${escapeHtmlAttribute(className)}__result" data-runtime-fallback-root>`,
    `<p class="${escapeHtmlAttribute(className)}__loading" data-runtime-loading hidden>Calculating…</p>`,
    `<p class="${escapeHtmlAttribute(className)}__static" data-runtime-fallback>Result: <output>${value}</output></p>`,
    `<p class="${escapeHtmlAttribute(className)}__live" data-runtime-live hidden>Result: <output data-calculator-output aria-live="polite">${value}</output></p>`,
    `<p class="${escapeHtmlAttribute(className)}__error" data-runtime-error role="alert" hidden></p>`,
    "</div>",
    "</div>",
  ].join("");
}
