import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagramFigure,
  findDiagramBlocks,
  resolveDiagramCaption,
} from "../index.js";
import { createRenderSession } from "../src/session.js";

test("findDiagramBlocks returns matching fenced code blocks", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-mermaid"] },
            children: [{ type: "text", value: "graph TD" }],
          },
        ],
      },
    ],
  };
  const [block] = findDiagramBlocks(tree, { languages: ["mermaid"] });
  assert.equal(block.source, "graph TD");
  assert.equal(block.language, "mermaid");
});

test("resolveDiagramCaption prioritizes a fence title", () => {
  const [block] = findDiagramBlocks(
    {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: { title: "Fence title" },
          children: [
            {
              type: "element",
              tagName: "code",
              properties: { className: ["language-d2"] },
              children: [{ type: "text", value: "a -> b" }],
            },
          ],
        },
      ],
    },
    { languages: ["d2"] },
  );
  assert.equal(
    resolveDiagramCaption(block, [() => "Directive"]),
    "Fence title",
  );
});

test("buildDiagramFigure emits the shared DOM contract", () => {
  const figure = buildDiagramFigure({
    className: "rb-example",
    id: "rb-example-a",
    kind: "example",
    source: "a -> b",
    caption: "Example",
    label: "Example",
    status: "rendered",
    fallback: true,
    content: { kind: "svg", svg: "<svg></svg>" },
  });
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.dataDiagram, "example");
  assert.equal(figure.properties?.dataDiagramStatus, "rendered");
  assert.equal(figure.children?.[0]?.properties?.dataDiagramCaption, "true");
  assert.equal(figure.children?.[1]?.properties?.dataDiagramContent, "true");
  assert.equal(figure.children?.[2]?.properties?.dataDiagramFallback, "true");
  assert.equal(
    figure.children?.[2]?.properties?.className,
    "rb-example__fallback rb-source-fallback",
  );
});

test("render sessions serialize work and retry selected failures", async () => {
  let attempts = 0;
  const session = createRenderSession({
    render: async () => {
      attempts += 1;
      return attempts === 1
        ? {
            ok: false as const,
            kind: "renderer-error" as const,
            message: "temporary",
          }
        : { ok: true as const, svg: "<svg></svg>" };
    },
    retry: (result) => result.kind === "renderer-error",
  });
  const result = await session.render("a", { id: "example" });
  assert.deepEqual(result, { ok: true, svg: "<svg></svg>" });
  assert.equal(attempts, 2);
  await session.dispose();
});

test("render sessions honour an already aborted signal", async () => {
  const controller = new AbortController();
  controller.abort();
  const session = createRenderSession({
    render: async () => ({ ok: true as const, svg: "<svg></svg>" }),
  });
  const result = await session.render("a", {
    id: "example",
    signal: controller.signal,
  });
  assert.deepEqual(result, {
    ok: false,
    kind: "aborted",
    message: "Diagram rendering was aborted.",
  });
  await session.dispose();
});

test("render sessions pass a launched resource and classify timeouts", async () => {
  let cleaned = false;
  const session = createRenderSession<string>({
    launch: async () => "renderer",
    cleanup: (resource) => {
      cleaned = resource === "renderer";
    },
    render: async (_source, _context, resource) => {
      assert.equal(resource, "renderer");
      await new Promise(() => undefined);
      return { ok: true, svg: "<svg></svg>" };
    },
    timeoutMs: 1,
  });
  const result = await session.render("a", { id: "example" });
  assert.deepEqual(result, {
    ok: false,
    kind: "timeout",
    message: "Diagram rendering timed out.",
  });
  await session.dispose();
  assert.equal(cleaned, true);
});
