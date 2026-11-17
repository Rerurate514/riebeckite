import assert from "node:assert/strict";
import { test } from "node:test";
import { plantuml } from "../index.js";
import {
  encodePlantuml,
  encodePlantumlBase64,
} from "../src/plantuml-encoder.js";
import { rehypePlantuml } from "../src/rehype.js";
import type { ElementNode, HastNode, TextNode } from "../src/types.js";

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function createTree(
  source: string,
  preProperties: Record<string, unknown> = {},
): HastNode {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: preProperties,
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-plantuml"] },
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

function find(node: ElementNode, tagName: string): ElementNode | undefined {
  if (node.tagName === tagName) return node;
  for (const child of node.children ?? []) {
    if (child.type !== "element") continue;
    const match = find(child as ElementNode, tagName);
    if (match) return match;
  }
  return undefined;
}

test("validates options", () => {
  const plugin = plantuml();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(plugin.validateOptions?.({ server: "ftp://example.com" }), [
    { path: "server", message: "Expected an absolute http(s) URL." },
  ]);
  assert.deepEqual(plugin.validateOptions?.({ format: "webp" } as never), [
    { path: "format", message: 'Expected "svg" or "png".' },
  ]);
  assert.deepEqual(
    plugin.validateOptions?.({ caption: "yes", fallback: 1 } as never),
    [
      { path: "caption", message: "Expected a boolean." },
      { path: "fallback", message: "Expected a boolean." },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      server: "https://example.com/plantuml",
      format: "png",
      caption: false,
      fallback: false,
    }),
    [],
  );
});

test("encodes bytes with PlantUML's custom base64 alphabet", () => {
  assert.equal(encodePlantumlBase64(new Uint8Array([0, 0, 0])), "0000");
  assert.equal(
    encodePlantumlBase64(new Uint8Array([0xff, 0xff, 0xff])),
    "____",
  );
  assert.equal(encodePlantumlBase64(new Uint8Array([0x12, 0x34])), "4ZG0");
  assert.equal(encodePlantumlBase64(new Uint8Array([0x01])), "0G00");
});

test("encodes diagram source deterministically", async () => {
  const source = "@startuml\nAlice -> Bob: こんにちは\n@enduml";
  const encoded = await encodePlantuml(source);

  assert.equal(encoded, await encodePlantuml(source));
  assert.ok(encoded.length > 0);
  for (const character of encoded) {
    assert.ok(
      ALPHABET.includes(character),
      `unexpected character ${character}`,
    );
  }
  assert.notEqual(encoded, await encodePlantuml(`${source} `));
  assert.ok(
    (await encodePlantuml("A".repeat(400))).length < 100,
    "compression should shrink repetitive sources",
  );
});

test("renders a figure that points at the configured server", async () => {
  const tree = createTree("@startuml\nA -> B\n@enduml");

  await rehypePlantuml({
    server: "https://example.com/puml///",
    format: "png",
  })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.className, "rb-plantuml");
  assert.equal(figure.properties?.dataPlantuml, true);

  const image = find(figure, "img");
  assert.ok(image);
  assert.match(
    String(image.properties?.src),
    /^https:\/\/example\.com\/puml\/png\/[0-9A-Za-z_-]+$/,
  );
  assert.equal(image.properties?.alt, "PlantUML diagram");
  assert.equal(image.properties?.loading, "lazy");
  assert.ok(find(figure, "details"), "fallback is shown by default");
});

test("uses the code block title as caption", async () => {
  const tree = createTree("@startuml\nA -> B\n@enduml", { title: "Sequence" });

  await rehypePlantuml()(tree, {});

  const caption = find(firstChild(tree), "figcaption");
  assert.equal((caption?.children?.[0] as TextNode)?.value, "Sequence");
});

test("extracts the caption directive and strips it from the source", async () => {
  const tree = createTree("%% caption: Flow\n@startuml\nA -> B\n@enduml");

  await rehypePlantuml()(tree, {});

  const figure = firstChild(tree);
  assert.equal(
    (find(figure, "figcaption")?.children?.[0] as TextNode)?.value,
    "Flow",
  );
  assert.equal(
    figure.properties?.dataPlantumlSource,
    "@startuml\nA -> B\n@enduml",
  );
  assert.ok(find(figure, "img"));
});

test("keeps the caption directive when captions are disabled", async () => {
  const tree = createTree("%% caption: Flow\n@startuml\nA -> B\n@enduml");

  await rehypePlantuml({ caption: false })(tree, {});

  assert.equal(find(firstChild(tree), "figcaption"), undefined);
  assert.equal(
    firstChild(tree).properties?.dataPlantumlSource,
    "%% caption: Flow\n@startuml\nA -> B\n@enduml",
  );
});

test("omits the source fallback when disabled", async () => {
  const tree = createTree("@startuml\nA -> B\n@enduml");

  await rehypePlantuml({ fallback: false })(tree, {});

  assert.ok(find(firstChild(tree), "img"));
  assert.equal(find(firstChild(tree), "details"), undefined);
});

test("reports empty diagrams and renders without an image", async () => {
  const messages: string[] = [];
  const file = {
    message(reason: string) {
      messages.push(reason);
      return {};
    },
  };
  const tree = createTree("   ");

  await rehypePlantuml()(tree, file);

  const figure = firstChild(tree);
  assert.equal(find(figure, "img"), undefined);
  assert.deepEqual(messages, ["Empty PlantUML diagram source."]);
});

test("ignores code blocks in other languages", async () => {
  const tree = createTree("@startuml\nA -> B\n@enduml");
  (
    (tree as { children: ElementNode[] }).children[0]
      .children?.[0] as ElementNode
  ).properties = { className: ["language-mermaid"] };

  await rehypePlantuml()(tree, {});

  assert.equal(firstChild(tree).tagName, "pre");
});
