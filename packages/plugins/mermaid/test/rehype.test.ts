import assert from "node:assert/strict";
import { test } from "node:test";
import { rehypeMermaid } from "../src/rehype.js";
import type {
  ElementNode,
  HastNode,
  MermaidRenderSession,
} from "../src/types.js";

function createTree(source: string): HastNode {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-mermaid"] },
            children: [{ type: "text", value: source }],
          },
        ],
      },
    ],
  };
}

function createSession(
  result: Awaited<ReturnType<MermaidRenderSession["render"]>>,
) {
  const calls: Array<{ id: string; source: string; theme: string }> = [];
  const session: MermaidRenderSession = {
    async render(id, source, theme) {
      calls.push({ id, source, theme });
      return result;
    },
    async dispose() {},
  };
  return { session, calls };
}

function firstChild(tree: HastNode) {
  return (tree as { children: HastNode[] }).children[0] as ElementNode;
}

test("build-rendered diagrams keep static svg and omit client source data", async () => {
  const tree = createTree("graph TD;A-->B");
  const { session, calls } = createSession({
    ok: true,
    svg: "<svg><text>ok</text></svg>",
  });

  await rehypeMermaid({ render: "build" }, session)(tree, {});

  const figure = firstChild(tree);

  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties.dataMermaid, undefined);
  assert.equal(figure.properties.dataMermaidSource, undefined);
  assert.equal(calls.length, 1);
  assert.deepEqual(
    calls.map((call) => call.theme),
    ["default"],
  );
  assert.equal(
    figure.children.some(
      (child) =>
        child.type === "element" &&
        child.tagName === "div" &&
        (child as ElementNode).children?.some(
          (grandchild) =>
            grandchild.type === "raw" &&
            (grandchild as { value?: string }).value?.includes("<svg>"),
        ),
    ),
    true,
  );
  assert.equal(
    figure.children.some(
      (child) => child.type === "element" && child.tagName === "details",
    ),
    true,
  );
});

test("client-rendered diagrams keep source data for runtime rendering", async () => {
  const tree = createTree("graph TD;A-->B");
  const { session, calls } = createSession({ ok: true, svg: "<svg></svg>" });

  await rehypeMermaid({ render: "client" }, session)(tree, {});

  const figure = firstChild(tree);

  assert.equal(figure.properties.dataMermaid, "pending");
  assert.equal(figure.properties.dataMermaidSource, "graph TD;A-->B");
  assert.equal(calls.length, 0);
});

test("build render failures keep source data for client fallback", async () => {
  const tree = createTree("INVALID");
  const { session } = createSession({
    ok: false,
    kind: "invalid-diagram",
    message: "Parse error",
  });

  await rehypeMermaid({ render: "build" }, session)(tree, {});

  const figure = firstChild(tree);

  assert.equal(figure.properties.dataMermaid, "pending");
  assert.equal(figure.properties.dataMermaidSource, "INVALID");
});
