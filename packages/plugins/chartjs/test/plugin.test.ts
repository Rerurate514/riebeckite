import assert from "node:assert/strict";
import { test } from "node:test";
import { chartjs } from "../index.js";
import { rehypeChartJs } from "../src/rehype.js";
import type { ElementNode, HastNode, TextNode } from "../src/types.js";

function createTree(
  source: string,
  properties: Record<string, unknown> = {},
  language = "chart",
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

function canvasConfig(figure: ElementNode): Record<string, unknown> {
  const canvas = child(figure, "canvas");
  assert.ok(canvas, "expected a canvas");
  return JSON.parse(String(canvas.properties?.dataDiagramConfig));
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

test("validates options", () => {
  const plugin = chartjs();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      responsive: "yes",
      caption: 1,
      className: " ",
    } as never),
    [
      { path: "responsive", message: "Expected a boolean." },
      { path: "caption", message: "Expected a boolean." },
      { path: "className", message: "Expected a non-empty string." },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      responsive: false,
      caption: false,
      className: "chart",
    }),
    [],
  );
});

test("renders a pending figure from a full config", () => {
  const tree = createTree(
    JSON.stringify({
      type: "bar",
      data: { labels: ["a"], datasets: [{ data: [1] }] },
    }),
  );

  rehypeChartJs()(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.dataDiagram, "chartjs");
  assert.equal(figure.properties?.dataDiagramStatus, "pending");
  assert.equal(figure.properties?.ariaBusy, "true");
  assert.equal(
    figure.properties?.dataChartjsMarker,
    "RIEBECKITE_EXTERNAL_CHARTJS_MARKER",
  );
  assert.deepEqual(canvasConfig(figure).data, {
    labels: ["a"],
    datasets: [{ data: [1] }],
  });
});

test("converts shorthand labels and datasets into a Chart.js config", () => {
  const tree = createTree(
    JSON.stringify({ type: "line", labels: ["x"], datasets: [{ data: [2] }] }),
  );

  rehypeChartJs()(tree, {});

  const config = canvasConfig(firstChild(tree));
  assert.equal(config.type, "line");
  assert.deepEqual(config.data, { labels: ["x"], datasets: [{ data: [2] }] });
  assert.equal(config.labels, undefined);
  assert.equal(config.datasets, undefined);
});

test("applies the responsive default without overriding explicit values", () => {
  const defaults = createTree(
    JSON.stringify({ type: "bar", data: { labels: [], datasets: [] } }),
  );
  const explicit = createTree(
    JSON.stringify({
      type: "bar",
      data: { labels: [], datasets: [] },
      options: { responsive: false },
    }),
  );
  const disabled = createTree(
    JSON.stringify({
      type: "bar",
      data: { labels: [], datasets: [] },
      options: {},
    }),
  );

  rehypeChartJs()(defaults, {});
  rehypeChartJs()(explicit, {});
  rehypeChartJs({ responsive: false })(disabled, {});

  assert.deepEqual(canvasConfig(firstChild(defaults)).options, {
    responsive: true,
  });
  assert.deepEqual(canvasConfig(firstChild(explicit)).options, {
    responsive: false,
  });
  assert.deepEqual(canvasConfig(firstChild(disabled)).options, {
    responsive: false,
  });
});

test("extracts captions from the config or the code block title", () => {
  const fromConfig = createTree(
    JSON.stringify({
      type: "bar",
      caption: " Sales ",
      data: { labels: [], datasets: [] },
    }),
  );
  const fromTitle = createTree(
    JSON.stringify({ type: "bar", data: { labels: [], datasets: [] } }),
    { title: "Revenue" },
  );

  rehypeChartJs()(fromConfig, {});
  rehypeChartJs()(fromTitle, {});

  assert.equal(
    (child(firstChild(fromConfig), "figcaption")?.children?.[0] as TextNode)
      ?.value,
    "Sales",
  );
  assert.equal(
    (child(firstChild(fromTitle), "figcaption")?.children?.[0] as TextNode)
      ?.value,
    "Revenue",
  );
  assert.equal(
    child(firstChild(fromConfig), "canvas")?.properties?.ariaLabelledby !==
      undefined,
    true,
  );
});

test("omits the caption when disabled and labels the canvas instead", () => {
  const tree = createTree(
    JSON.stringify({
      type: "pie",
      caption: "Ignored",
      data: { labels: [], datasets: [] },
    }),
  );

  rehypeChartJs({ caption: false })(tree, {});

  const figure = firstChild(tree);
  assert.equal(child(figure, "figcaption"), undefined);
  assert.equal(child(figure, "canvas")?.properties?.ariaLabel, "Chart: pie");
});

test("reports invalid configs and leaves the code block untouched", () => {
  const cases = [
    ["{ not json", "Invalid JSON:"],
    ["[]", "Expected a JSON object."],
    ['{"data":{"labels":[],"datasets":[]}}', 'Missing "type"'],
    ['{"type":"bar","data":{"labels":[]}}', 'Expected "data.labels"'],
    ['{"type":"bar"}', "Expected a full Chart.js config"],
  ] as const;

  for (const [source, expected] of cases) {
    const tree = createTree(source);
    const file = createFile();

    rehypeChartJs()(tree, file);

    assert.equal(firstChild(tree).tagName, "pre", source);
    assert.equal(file.messages.length, 1, source);
    assert.match(file.messages[0], new RegExp(expected.replace(".", "\\.")));
  }
});

test("ignores other languages and keeps ids deterministic", () => {
  const source = JSON.stringify({
    type: "bar",
    data: { labels: ["a"], datasets: [] },
  });
  const ignored = createTree(source, {}, "json");
  const first = createTree(source);
  const second = createTree(source);

  rehypeChartJs()(ignored, {});
  rehypeChartJs()(first, {});
  rehypeChartJs()(second, {});

  assert.equal(firstChild(ignored).tagName, "pre");
  assert.equal(
    firstChild(first).properties?.dataDiagramId,
    firstChild(second).properties?.dataDiagramId,
  );
  assert.match(
    String(firstChild(first).properties?.dataDiagramId),
    /^rb-chartjs-/,
  );
});
