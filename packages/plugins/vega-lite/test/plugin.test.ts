import assert from "node:assert/strict";
import { test } from "node:test";
import { vegaLite } from "../index.js";
import { rehypeVegaLite } from "../src/rehype.js";
import type { ElementNode, HastNode } from "../src/types.js";

function createTree(
  source: string,
  properties: Record<string, unknown> = {},
  language = "vega-lite",
): HastNode {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties,
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: [`language-${language}`] },
            children: [{ type: "text", value: source }],
          },
        ],
      },
    ],
  };
}

function firstChild(tree: HastNode): ElementNode {
  return (tree as { children: ElementNode[] }).children[0];
}

function child(node: ElementNode, tagName: string): ElementNode | undefined {
  return (node.children ?? []).find(
    (entry): entry is ElementNode =>
      entry.type === "element" && entry.tagName === tagName,
  );
}

function find(node: ElementNode, tagName: string): ElementNode | undefined {
  const direct = child(node, tagName);
  if (direct) return direct;
  for (const entry of node.children ?? []) {
    if (entry.type !== "element") continue;
    const match = find(entry as ElementNode, tagName);
    if (match) return match;
  }
  return undefined;
}

function createFile() {
  const messages: string[] = [];
  return {
    messages,
    message(reason: string) {
      messages.push(reason);
      return {};
    },
  };
}

const SPEC = JSON.stringify({
  mark: "bar",
  data: { values: [{ a: 1 }] },
  encoding: {},
});

test("validates options", () => {
  const plugin = vegaLite();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      caption: "yes",
      actions: "no",
      theme: "sepia",
      renderer: "webgl",
      className: " ",
    } as never),
    [
      { path: "caption", message: "Expected a boolean." },
      { path: "actions", message: "Expected a boolean or null." },
      { path: "theme", message: 'Expected "light", "dark", or "none".' },
      { path: "renderer", message: 'Expected "canvas" or "svg".' },
      { path: "className", message: "Expected a non-empty string." },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      caption: false,
      actions: null,
      theme: "dark",
      renderer: "svg",
      className: "chart",
    }),
    [],
  );
});

test("renders a pending figure with the parsed spec", () => {
  const tree = createTree(SPEC);

  rehypeVegaLite()(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.className, "rb-vega-lite");
  assert.equal(figure.properties?.dataVegaLite, "pending");
  assert.equal(figure.properties?.dataVegaLiteTheme, "light");
  assert.equal(figure.properties?.dataVegaLiteRenderer, "canvas");
  assert.equal(figure.properties?.dataVegaLiteActions, undefined);
  assert.deepEqual(JSON.parse(String(figure.properties?.dataVegaLiteSpec)), {
    mark: "bar",
    data: { values: [{ a: 1 }] },
    encoding: {},
  });

  const canvas = child(figure, "div");
  assert.equal(canvas?.properties?.role, "img");
  assert.equal(canvas?.properties?.ariaLabel, "Vega-Lite chart");
  assert.equal(
    find(child(figure, "details") as ElementNode, "code")?.children?.[0]?.value,
    SPEC,
  );
});

test("applies theme, renderer, and actions", () => {
  const tree = createTree(SPEC);

  rehypeVegaLite({
    theme: "dark",
    renderer: "svg",
    actions: false,
    className: "chart",
  })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.properties?.className, "chart");
  assert.equal(figure.properties?.dataVegaLiteTheme, "dark");
  assert.equal(figure.properties?.dataVegaLiteRenderer, "svg");
  assert.equal(figure.properties?.dataVegaLiteActions, "false");
  assert.equal(child(figure, "div")?.properties?.className, "chart__canvas");
});

test("extracts captions from the title or the spec", () => {
  const fromTitle = createTree(SPEC, { title: "Title" });
  const fromSpec = createTree(
    JSON.stringify({ ...JSON.parse(SPEC), title: "Spec title" }),
  );
  const fromSpecObject = createTree(
    JSON.stringify({ ...JSON.parse(SPEC), title: { text: "Object title" } }),
  );

  rehypeVegaLite()(fromTitle, {});
  rehypeVegaLite()(fromSpec, {});
  rehypeVegaLite()(fromSpecObject, {});

  for (const [tree, expected] of [
    [fromTitle, "Title"],
    [fromSpec, "Spec title"],
    [fromSpecObject, "Object title"],
  ] as const) {
    assert.equal(
      child(firstChild(tree), "figcaption")?.children?.[0]?.value,
      expected,
    );
    assert.equal(
      child(firstChild(tree), "div")?.properties?.ariaLabel,
      expected,
    );
  }
});

test("omits the caption when disabled", () => {
  const tree = createTree(JSON.stringify({ ...JSON.parse(SPEC), title: "Hi" }));

  rehypeVegaLite({ caption: false })(tree, {});

  const figure = firstChild(tree);
  assert.equal(child(figure, "figcaption"), undefined);
  assert.equal(child(figure, "div")?.properties?.ariaLabel, "Vega-Lite chart");
});

test("reports invalid specs and leaves the block intact", () => {
  for (const [source, expected] of [
    ["{ nope", "Invalid Vega-Lite spec: Invalid JSON:"],
    ["[]", "Invalid Vega-Lite spec: Expected a JSON object."],
    ["null", "Invalid Vega-Lite spec: Expected a JSON object."],
  ] as const) {
    const tree = createTree(source);
    const file = createFile();

    rehypeVegaLite()(tree, file);

    assert.equal(firstChild(tree).tagName, "pre", source);
    assert.equal(file.messages.length, 1, source);
    assert.ok(file.messages[0].startsWith(expected), file.messages[0]);
  }
});

test("accepts vega fences and ignores other languages", () => {
  const vega = createTree(SPEC, {}, "vega");
  const ignored = createTree(SPEC, {}, "json");

  rehypeVegaLite()(vega, {});
  rehypeVegaLite()(ignored, {});

  assert.equal(firstChild(vega).tagName, "figure");
  assert.equal(firstChild(ignored).tagName, "pre");
});
