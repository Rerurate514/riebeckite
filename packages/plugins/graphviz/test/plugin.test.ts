import assert from "node:assert/strict";
import { test } from "node:test";
import { graphviz } from "../index.js";
import { rehypeGraphviz } from "../src/rehype.js";
import type { ElementNode, HastNode, TextNode } from "../src/types.js";

function createTree(
  source: string,
  properties: Record<string, unknown> = {},
  language = "dot",
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

const SOURCE = "digraph { a -> b }";

test("validates options", () => {
  const plugin = graphviz();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      render: "server",
      engine: "bogus",
      caption: "yes",
      fallback: 0,
      className: 1,
    } as never),
    [
      { path: "render", message: 'Expected "build", "client", or "both".' },
      {
        path: "engine",
        message: 'Expected "dot", "neato", "fdp", "sfdp", "circo", or "twopi".',
      },
      { path: "caption", message: "Expected a boolean." },
      { path: "fallback", message: "Expected a boolean." },
      { path: "className", message: "Expected a string." },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      render: "both",
      engine: "neato",
      caption: false,
      fallback: false,
      className: "graph",
    }),
    [],
  );
});

test("client rendering emits a pending figure without an SVG", async () => {
  const tree = createTree(SOURCE);

  await rehypeGraphviz({ render: "client" })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.className, "rb-graphviz");
  assert.equal(figure.properties?.dataGraphviz, "pending");
  assert.equal(figure.properties?.dataGraphvizEngine, "dot");
  assert.equal(figure.properties?.dataGraphvizSource, SOURCE);

  const canvas = child(figure, "div");
  assert.equal(canvas?.properties?.role, "img");
  assert.equal(canvas?.properties?.ariaLabel, "Graphviz diagram");
  assert.deepEqual(canvas?.children, []);

  const fallback = child(figure, "details");
  assert.equal(fallback?.properties?.dataDiagramFallback, "true");
});

test("keeps supported engines and normalizes unknown ones", async () => {
  const neato = createTree(SOURCE);
  const unknown = createTree(SOURCE);

  await rehypeGraphviz({ render: "client", engine: "neato" })(neato, {});
  await rehypeGraphviz({ render: "client", engine: "bogus" as never })(
    unknown,
    {},
  );

  assert.equal(firstChild(neato).properties?.dataGraphvizEngine, "neato");
  assert.equal(firstChild(unknown).properties?.dataGraphvizEngine, "dot");
});

test("extracts captions from the title, line comment, and block comment", async () => {
  const fromTitle = createTree(SOURCE, { title: "Flow" });
  const fromLine = createTree(`// caption: Line\n${SOURCE}`);
  const fromBlock = createTree(`/* caption: Block */\n${SOURCE}`);

  await rehypeGraphviz({ render: "client" })(fromTitle, {});
  await rehypeGraphviz({ render: "client" })(fromLine, {});
  await rehypeGraphviz({ render: "client" })(fromBlock, {});

  assert.equal(
    (child(firstChild(fromTitle), "figcaption")?.children?.[0] as TextNode)
      ?.value,
    "Flow",
  );
  assert.equal(
    (child(firstChild(fromLine), "figcaption")?.children?.[0] as TextNode)
      ?.value,
    "Line",
  );
  assert.equal(
    (child(firstChild(fromBlock), "figcaption")?.children?.[0] as TextNode)
      ?.value,
    "Block",
  );
  assert.equal(
    child(firstChild(fromLine), "div")?.properties?.ariaLabelledby,
    child(firstChild(fromLine), "figcaption")?.properties?.id,
  );
});

test("honours caption, fallback, and className options", async () => {
  const tree = createTree(`// caption: Hidden\n${SOURCE}`);

  await rehypeGraphviz({
    render: "client",
    caption: false,
    fallback: false,
    className: "graph",
  })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.properties?.className, "graph");
  assert.equal(child(figure, "figcaption"), undefined);
  assert.equal(child(figure, "details"), undefined);
  assert.equal(child(figure, "div")?.properties?.ariaLabel, "Graphviz diagram");
});

test("renders an inline SVG for the build mode", async () => {
  const tree = createTree(SOURCE);

  await rehypeGraphviz({ render: "build" })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.properties?.dataGraphviz, "rendered");
  const canvas = child(figure, "div");
  const raw = canvas?.children?.[0] as { type: string; value: string };
  assert.equal(raw.type, "raw");
  assert.match(raw.value, /^<svg/);
  assert.match(raw.value, /<\/svg>$/);
});

test("falls back to client rendering when the diagram is invalid", async () => {
  const tree = createTree("digraph { this is not dot");
  const file = createFile();

  await rehypeGraphviz({ render: "build" })(tree, file);

  const figure = firstChild(tree);
  assert.equal(figure.properties?.dataGraphviz, "pending");
  assert.equal(file.messages.length, 1);
  assert.match(file.messages[0], /^Invalid Graphviz diagram: /);
});

test("accepts dot and graphviz fences and ignores other languages", async () => {
  const graphvizFence = createTree(SOURCE, {}, "graphviz");
  const ignored = createTree(SOURCE, {}, "mermaid");

  await rehypeGraphviz({ render: "client" })(graphvizFence, {});
  await rehypeGraphviz({ render: "client" })(ignored, {});

  assert.equal(firstChild(graphvizFence).tagName, "figure");
  assert.equal(firstChild(ignored).tagName, "pre");
});
