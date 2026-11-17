import assert from "node:assert/strict";
import { test } from "node:test";
import { wavedrom } from "../index.js";
import { rehypeWavedrom } from "../src/rehype.js";
import type { ElementNode, HastNode, TextNode } from "../src/types.js";

function createTree(
  source: string,
  properties: Record<string, unknown> = {},
  language = "wavedrom",
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

const SOURCE = JSON.stringify({ signal: [{ name: "clk", wave: "p..." }] });

test("validates options", () => {
  const plugin = wavedrom();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      skin: "fancy",
      caption: "yes",
      fallback: 1,
      className: " ",
    } as never),
    [
      { path: "skin", message: 'Expected "default", "narrow", or "lowkey".' },
      { path: "caption", message: "Expected a boolean." },
      { path: "fallback", message: "Expected a boolean." },
      { path: "className", message: "Expected a non-empty string." },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      skin: "lowkey",
      caption: false,
      fallback: false,
      className: "wave",
    }),
    [],
  );
});

test("renders a pending figure with the parsed spec", () => {
  const tree = createTree(SOURCE);

  rehypeWavedrom()(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.className, "rb-wavedrom");
  assert.equal(figure.properties?.dataWavedrom, "pending");
  assert.equal(figure.properties?.dataWavedromSkin, "default");
  assert.deepEqual(JSON.parse(String(figure.properties?.dataWavedromSpec)), {
    signal: [{ name: "clk", wave: "p..." }],
  });
  assert.equal(
    child(figure, "div")?.properties?.ariaLabel,
    "WaveDrom timing diagram",
  );
  assert.equal(child(figure, "figcaption"), undefined);
});

test("accepts every WaveDrom body form", () => {
  for (const source of [
    JSON.stringify({ signal: [] }),
    JSON.stringify({ assign: [] }),
    JSON.stringify({ reg: {} }),
  ]) {
    const tree = createTree(source);
    rehypeWavedrom()(tree, {});
    assert.equal(firstChild(tree).tagName, "figure", source);
  }
});

test("extracts and strips the caption from the spec", () => {
  const tree = createTree(JSON.stringify({ caption: " Clock ", signal: [] }));

  rehypeWavedrom()(tree, {});

  const figure = firstChild(tree);
  assert.equal(
    (child(figure, "figcaption")?.children?.[0] as TextNode)?.value,
    "Clock",
  );
  assert.deepEqual(JSON.parse(String(figure.properties?.dataWavedromSpec)), {
    signal: [],
  });
  assert.equal(
    child(figure, "div")?.properties?.ariaLabelledby,
    child(figure, "figcaption")?.properties?.id,
  );
});

test("prefers the fence title and honours caption/fallback/skin options", () => {
  const tree = createTree(JSON.stringify({ caption: "Spec", signal: [] }), {
    title: "Title",
  });

  rehypeWavedrom({
    skin: "narrow",
    caption: false,
    fallback: false,
    className: "wave",
  })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.properties?.className, "wave");
  assert.equal(figure.properties?.dataWavedromSkin, "narrow");
  assert.equal(child(figure, "figcaption"), undefined);
  assert.equal(child(figure, "details"), undefined);

  const titled = createTree(JSON.stringify({ signal: [] }), { title: "Title" });
  rehypeWavedrom()(titled, {});
  assert.equal(
    (child(firstChild(titled), "figcaption")?.children?.[0] as TextNode)?.value,
    "Title",
  );
});

test("reports invalid configs and leaves the block intact", () => {
  for (const [source, expected] of [
    ["{ nope", "Invalid WaveDrom config: Invalid JSON:"],
    ["[]", "Invalid WaveDrom config: Expected a JSON object."],
    [
      "{}",
      'Invalid WaveDrom config: Expected a WaveJSON object with a "signal", "assign", or "reg" property.',
    ],
  ] as const) {
    const tree = createTree(source);
    const file = createFile();

    rehypeWavedrom()(tree, file);

    assert.equal(firstChild(tree).tagName, "pre", source);
    assert.equal(file.messages.length, 1, source);
    assert.ok(file.messages[0].startsWith(expected), file.messages[0]);
  }
});

test("accepts wavejson fences and ignores other languages", () => {
  const wavejson = createTree(SOURCE, {}, "wavejson");
  const ignored = createTree(SOURCE, {}, "json");

  rehypeWavedrom()(wavejson, {});
  rehypeWavedrom()(ignored, {});

  assert.equal(firstChild(wavejson).tagName, "figure");
  assert.equal(firstChild(ignored).tagName, "pre");
});
