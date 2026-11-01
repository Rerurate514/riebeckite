import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculator,
  evaluateExpression,
  formatExpressionValue,
  renderCalculator,
} from "../index.js";

test("evaluates arithmetic with precedence and parentheses", () => {
  assert.deepEqual(evaluateExpression("2 + 3 * 4"), { ok: true, value: 14 });
  assert.deepEqual(evaluateExpression("(2 + 3) * 4"), { ok: true, value: 20 });
  assert.deepEqual(evaluateExpression(" -2 * (3 - 5) "), {
    ok: true,
    value: 4,
  });
  assert.deepEqual(evaluateExpression(".5 + 1.5"), { ok: true, value: 2 });
});

test("rejects malformed expressions and division by zero", () => {
  for (const source of ["", "1 +", "(1 + 2", "2 / 0", "1e3", "alert(1)"]) {
    assert.equal(evaluateExpression(source).ok, false, source);
  }
});

test("formats values without binary floating point noise", () => {
  assert.equal(formatExpressionValue(0.1 + 0.2), "0.3");
});

test("renders a static fallback and a runtime mount point", () => {
  const html = renderCalculator("2 * 3");
  assert.match(html, /data-calculator/);
  assert.match(html, /data-runtime-fallback/);
  assert.match(html, /data-calculator-output/);
  assert.match(html, /Result: <output>6<\/output>/);
  assert.match(html, /role="alert"/);
});

test("renders invalid expressions without a runtime mount point", () => {
  const html = renderCalculator("2 / 0");
  assert.doesNotMatch(html, /data-calculator(?!=)/);
  assert.match(html, /Invalid expression: Division by zero\./);
});

test("declares a lazy runtime dependency and a presence selector", () => {
  const plugin = calculator();
  assert.equal(plugin.clientEntries?.length, 1);
  const entry = plugin.clientEntries?.[0];
  assert.equal(entry?.presenceSelector, "[data-calculator]");
  assert.equal(entry?.initializerArguments, "context");
  assert.equal(entry?.runtimeEntries?.[0]?.id, "calculator");
  assert.equal(
    entry?.runtimeEntries?.[0]?.moduleSpecifier,
    "@riebeckite/plugin-calculator/client-runtime",
  );
});
