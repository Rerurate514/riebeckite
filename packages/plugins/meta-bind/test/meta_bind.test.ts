import assert from "node:assert/strict";
import { test } from "node:test";
import type { Html, Root } from "mdast";
import { evaluateMetaBindExpression } from "../src/evaluate.ts";
import { parseMetaBind } from "../src/parse.ts";
import { remarkMetaBind } from "../src/remark.ts";
import { renderMetaBind } from "../src/render.ts";

test("parses supported same-page INPUT and VIEW fields", () => {
  const input = parseMetaBind(
    "INPUT[slider(minValue(0), maxValue(10), stepSize(1)):score]",
  );
  assert.equal(input.ok, true);
  if (!input.ok) return;
  assert.equal(input.value.kind, "input");
  assert.equal(input.value.input, "slider");

  const view = parseMetaBind("VIEW[{score} * 2 >= 10]");
  assert.equal(view.ok, true);
  if (!view.ok || view.value.kind !== "view") return;
  assert.equal(
    evaluateMetaBindExpression(view.value.expression, { score: 5 }),
    true,
  );
});

test("parses documented INPUT and VIEW fixture forms", () => {
  for (const source of [
    "INPUT[text(placeholder('Name')):profile.name]",
    "INPUT[number(minValue(1), maxValue(5), defaultValue(2)):priority]",
    "INPUT[slider(minValue(0), maxValue(10), stepSize(0.5)):progress]",
    "INPUT[toggle(onValue('yes'), offValue('no')):done]",
    "VIEW[{progress} / 2][math]",
  ]) {
    assert.equal(parseMetaBind(source).ok, true, source);
  }
  const select = parseMetaBind(
    "INPUT[select(option('low', 'Low'), option('high', 'High')):priority]",
    false,
  );
  assert.equal(select.ok, true);
  if (!select.ok || select.value.kind !== "input") return;
  assert.deepEqual(select.value.options, [
    { value: "low", label: "Low" },
    { value: "high", label: "High" },
  ]);
  assert.equal(parseMetaBind("INPUT[select(option(low)):priority]").ok, false);
});

test("rejects unsupported targets and oversized expressions", () => {
  assert.equal(parseMetaBind("INPUT[text:memory^value]").ok, false);
  assert.equal(parseMetaBind("INPUT[text:__proto__.value]").ok, false);
  assert.equal(parseMetaBind(`VIEW[${"1+".repeat(600)}1]`).ok, false);
});

test("renders escaped initial values without exposing unrelated frontmatter", () => {
  const parsed = parseMetaBind("INPUT[text:profile.name]");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const html = renderMetaBind(parsed.value, {
    profile: { name: "<safe>" },
    private: "secret",
  });
  assert.match(html, /&lt;safe&gt;/);
  assert.doesNotMatch(html, /secret/);
});

test("escapes field arguments and VIEW data attributes", () => {
  const input = parseMetaBind(
    "INPUT[text(defaultValue('<img src=x onerror=alert(1)>')):name]",
  );
  const view = parseMetaBind("VIEW[{name}]");
  assert.equal(input.ok, true);
  assert.equal(view.ok, true);
  if (!input.ok || !view.ok) return;
  assert.doesNotMatch(renderMetaBind(input.value), /<img/);
  const html = renderMetaBind(view.value, { name: '" onmouseover="alert(1)' });
  assert.match(html, /&quot;/);
  assert.doesNotMatch(html, /data-meta-bind-values="[^"]*" onmouseover=/);
});

test("remark replaces valid fields and preserves invalid Markdown", () => {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [{ type: "inlineCode", value: "VIEW[{count} + 1]" }],
      },
      {
        type: "code",
        lang: "meta-bind",
        value: "INPUT[toggle:done]\nVIEW[{done}]",
      },
      { type: "code", lang: "meta-bind", value: "INPUT[button:done]" },
    ],
  };
  const messages: Array<Record<string, unknown>> = [];
  remarkMetaBind()(tree, {
    data: { matter: { count: 2, done: false } },
    message: () => {
      const message: Record<string, unknown> = {};
      messages.push(message);
      return message;
    },
  });

  const paragraph = tree.children[0] as { children: Html[] };
  assert.equal(paragraph.children[0]?.type, "html");
  assert.match(paragraph.children[0]?.value ?? "", />3<\/output>/);
  assert.equal(tree.children[1]?.type, "html");
  assert.equal(tree.children[2]?.type, "code");
  assert.equal(messages[0]?.source, "@riebeckite/plugin-meta-bind");
});

test("bounded evaluation returns a safe value for hostile depth", () => {
  const parsed = parseMetaBind("VIEW[1]");
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.value.kind !== "view") return;
  let expression = parsed.value.expression;
  for (let index = 0; index < 80; index += 1) {
    expression = {
      kind: "unary",
      operator: "-",
      value: expression,
    };
  }
  assert.equal(evaluateMetaBindExpression(expression, {}), null);
});
