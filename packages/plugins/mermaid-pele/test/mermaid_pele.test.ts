import assert from "node:assert/strict";
import { test } from "node:test";
import { mermaidPele } from "../index.js";
import { renderPeleSvg } from "../src/renderer.js";
import {
  MermaidRendererConflictError,
  rehypeMermaidPele,
} from "../src/transformer.js";
import type { HastNode } from "../src/types.js";

function codeBlock(language: string, source: string): HastNode {
  return {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties: { className: [`language-${language}`] },
        children: [{ type: "text", value: source }],
      },
    ],
  };
}

function tree(...children: HastNode[]): HastNode {
  return { type: "root", children };
}

function html(root: HastNode): string {
  return JSON.stringify(root);
}

test("renders Mermaid code blocks to deterministic, distinct SVGs", () => {
  const first = tree(
    codeBlock("mermaid", "flowchart TD\n  A[Start] --> B[End]"),
    codeBlock("mermaid", "flowchart TD\n  A[Start] --> B[End]"),
  );
  const second = structuredClone(first);

  rehypeMermaidPele()(first, {});
  rehypeMermaidPele()(second, {});

  const output = html(first);
  assert.equal(output, html(second));
  assert.match(output, /<svg/);
  assert.match(output, /rr-mermaid-pele-[a-z0-9]+-0/);
  assert.match(output, /rr-mermaid-pele-[a-z0-9]+-1/);
});

test("leaves ordinary code blocks unchanged", () => {
  const input = tree(codeBlock("typescript", "const value = '<script>';"));

  rehypeMermaidPele()(input, {});

  assert.match(html(input), /language-typescript/);
  assert.match(html(input), /&lt;script&gt;|<script>/);
});

test("keeps invalid source as text and reports a diagnostic", () => {
  const input = tree(codeBlock("mermaid", "not a diagram"));
  const messages: string[] = [];

  rehypeMermaidPele()(input, {
    message: (message: string) => messages.push(message),
  });

  const output = html(input);
  assert.equal(messages.length, 1);
  assert.match(output, /rr-mermaid-pele__error/);
  assert.match(output, /not a diagram/);
});

test("does not emit executable SVG markup from diagram text", () => {
  const rejected = renderPeleSvg(
    "flowchart TD\n  A[<script>alert(1)</script>] --> B",
    "rejected",
  );
  const result = renderPeleSvg("flowchart TD\n  A --> B", "safety");

  assert.equal(rejected.ok, false);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.doesNotMatch(result.svg, /<\/?script\b/i);
  assert.doesNotMatch(result.svg, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(result.svg, /<\/?foreignObject\b/i);
  assert.doesNotMatch(result.svg, /javascript:/i);
});

test("rejects concurrent use with the existing Mermaid renderer", () => {
  const input = tree({
    type: "element",
    tagName: "figure",
    properties: { dataRiebeckiteMermaidRenderer: "mermaid" },
    children: [],
  });

  assert.throws(
    () => rehypeMermaidPele()(input, {}),
    MermaidRendererConflictError,
  );
});

test("accepts only Pele's CSS-variable auto theme", () => {
  assert.deepEqual(
    mermaidPele({ theme: "auto" }).validateOptions?.({ theme: "auto" }),
    [],
  );
  assert.deepEqual(
    mermaidPele().validateOptions?.({ theme: "dark" } as never),
    [{ path: "theme", message: 'Expected "auto".' }],
  );
});
