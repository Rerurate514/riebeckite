import assert from "node:assert/strict";
import { test } from "node:test";
import { markmap } from "../index.js";
import { resolveMarkmapOptions } from "../src/options.js";
import { describeMarkmapTree, parseMarkmapSource } from "../src/parse.js";
import { rehypeMarkmap } from "../src/rehype.js";
import type { ElementNode, HastNode, TextNode } from "../src/types.js";

function createTree(
  source: string,
  properties: Record<string, unknown> = {},
  language = "markmap",
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

test("parses headings into a tree", () => {
  const tree = parseMarkmapSource(
    "# Root\n## Child A\n### Grandchild\n## Child B\n# Second root",
  );

  assert.ok(tree);
  assert.equal(tree.content, "");
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].content, "Root");
  assert.deepEqual(
    tree.children[0].children.map((node) => node.content),
    ["Child A", "Child B"],
  );
  assert.equal(tree.children[0].children[0].children[0].content, "Grandchild");
  assert.equal(tree.children[1].content, "Second root");
});

test("returns a single root directly and ignores fenced code", () => {
  const single = parseMarkmapSource("# Only\nbody text");
  const fenced = parseMarkmapSource(
    "# Root\n```\n# Not a heading\n```\n## Kept",
  );

  assert.equal(single?.content, "Only");
  assert.deepEqual(
    fenced?.children.map((node) => node.content),
    ["Kept"],
  );
});

test("returns null when no heading exists", () => {
  assert.equal(parseMarkmapSource("just text"), null);
  assert.equal(parseMarkmapSource("#not-a-heading"), null);
});

test("describes a tree by its first non-empty label", () => {
  assert.equal(describeMarkmapTree(null), "");
  assert.equal(
    describeMarkmapTree({ content: " Root ", children: [] }),
    "Root",
  );
  assert.equal(
    describeMarkmapTree({
      content: "",
      children: [
        { content: "", children: [] },
        { content: "Nested", children: [] },
      ],
    }),
    "Nested",
  );
  assert.equal(describeMarkmapTree({ content: "", children: [] }), "");
});

test("resolves option defaults and normalizes invalid values", () => {
  assert.deepEqual(resolveMarkmapOptions(), {
    caption: true,
    height: 320,
    className: "rb-markmap",
    language: "markmap",
    fallback: true,
    colorFreezeLevel: null,
  });
  assert.deepEqual(
    resolveMarkmapOptions({
      height: -1,
      className: " ",
      language: " ",
      colorFreezeLevel: 1.5,
    }),
    {
      caption: true,
      height: 320,
      className: "rb-markmap",
      language: "markmap",
      fallback: true,
      colorFreezeLevel: null,
    },
  );
  assert.deepEqual(
    resolveMarkmapOptions({
      caption: false,
      height: 500,
      className: "map",
      language: "mindmap",
      fallback: false,
      colorFreezeLevel: 0,
    }),
    {
      caption: false,
      height: 500,
      className: "map",
      language: "mindmap",
      fallback: false,
      colorFreezeLevel: 0,
    },
  );
});

test("validates options", () => {
  const plugin = markmap();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      caption: "yes",
      fallback: 1,
      className: "",
      language: 2,
      height: 0,
      colorFreezeLevel: -1,
    } as never),
    [
      { path: "caption", message: "Expected a boolean." },
      { path: "fallback", message: "Expected a boolean." },
      { path: "className", message: "Expected a non-empty string." },
      { path: "language", message: "Expected a non-empty string." },
      { path: "height", message: "Expected a positive number." },
      {
        path: "colorFreezeLevel",
        message: "Expected a non-negative integer.",
      },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      caption: true,
      fallback: true,
      className: "map",
      language: "mindmap",
      height: 200,
      colorFreezeLevel: 2,
    }),
    [],
  );
});

test("renders a pending figure carrying the source and options", () => {
  const tree = createTree("# Root\n## Child");

  rehypeMarkmap({ height: 400, colorFreezeLevel: 1 })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.className, "rb-markmap");
  assert.equal(figure.properties?.dataMarkmap, "pending");
  assert.equal(figure.properties?.dataMarkmapSource, "# Root\n## Child");
  assert.equal(figure.properties?.dataMarkmapHeight, "400");
  assert.equal(figure.properties?.dataMarkmapColorFreezeLevel, "1");

  const canvas = child(figure, "div");
  assert.equal(canvas?.properties?.role, "img");
  assert.equal(canvas?.properties?.ariaLabel, "Root");

  const fallback = child(figure, "details");
  assert.equal(
    (find(fallback as ElementNode, "code")?.children?.[0] as TextNode)?.value,
    "# Root\n## Child",
  );
});

test("uses the fence title as caption", () => {
  const tree = createTree("# Root", { title: "Mind map" });

  rehypeMarkmap()(tree, {});

  const figure = firstChild(tree);
  const caption = child(figure, "figcaption");
  assert.equal((caption?.children?.[0] as TextNode)?.value, "Mind map");
  assert.equal(
    child(figure, "div")?.properties?.ariaLabelledby,
    "rb-markmap-caption",
  );
});

test("omits caption and fallback when disabled", () => {
  const tree = createTree("# Root", { title: "Ignored" });

  rehypeMarkmap({ caption: false, fallback: false })(tree, {});

  const figure = firstChild(tree);
  assert.equal(child(figure, "figcaption"), undefined);
  assert.equal(child(figure, "details"), undefined);
  assert.equal(child(figure, "div")?.properties?.ariaLabel, "Root");
});

test("reports sources without headings and leaves the block intact", () => {
  const messages: string[] = [];
  const file = {
    message(reason: string) {
      messages.push(reason);
      return {};
    },
  };
  const tree = createTree("no headings here");

  rehypeMarkmap()(tree, file);

  assert.equal(firstChild(tree).tagName, "pre");
  assert.deepEqual(messages, [
    "Invalid Markmap source: Expected at least one Markdown heading.",
  ]);
});

test("honours a custom fence language", () => {
  const custom = createTree("# Root", {}, "mindmap");
  const ignored = createTree("# Root", {}, "markmap");

  rehypeMarkmap({ language: "mindmap" })(custom, {});
  rehypeMarkmap({ language: "mindmap" })(ignored, {});

  assert.equal(firstChild(custom).tagName, "figure");
  assert.equal(firstChild(ignored).tagName, "pre");
});
