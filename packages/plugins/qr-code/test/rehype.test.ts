import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveQrCodeOptions } from "../src/options.js";
import { getTextContent, rehypeQrCode } from "../src/rehype.js";
import type { ElementNode, HastNode } from "../src/types.js";

function createTree(
  source: string,
  properties: Record<string, unknown> = {},
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
            properties: { className: ["language-qr"] },
            children: [{ type: "text", value: source }],
          },
        ],
      },
    ],
  };
}

async function render(
  source: string,
  options: Record<string, unknown> = {},
  properties: Record<string, unknown> = {},
  file: unknown = {},
): Promise<ElementNode> {
  const tree = createTree(source, properties);
  await rehypeQrCode(resolveQrCodeOptions(options))(tree, file);
  return firstChild(tree);
}

function firstChild(tree: HastNode): ElementNode {
  const children = (tree as { children?: HastNode[] }).children ?? [];
  return children[0] as ElementNode;
}

function hasClass(node: HastNode, className: string): boolean {
  if (node.type !== "element") return false;
  const value = (node as ElementNode).properties?.className;
  const classes = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return classes.includes(className);
}

function findElement(node: HastNode, className: string): ElementNode | null {
  if (hasClass(node, className)) return node as ElementNode;
  for (const child of (node as ElementNode).children ?? []) {
    const found = findElement(child, className);
    if (found) return found;
  }
  return null;
}

function hasTag(node: HastNode, tagName: string): boolean {
  if (node.type === "element" && (node as ElementNode).tagName === tagName) {
    return true;
  }
  for (const child of (node as ElementNode).children ?? []) {
    if (hasTag(child, tagName)) return true;
  }
  return false;
}

function includesRaw(node: HastNode, needle: string): boolean {
  if (node.type === "raw") {
    return String((node as { value?: string }).value).includes(needle);
  }
  for (const child of (node as ElementNode).children ?? []) {
    if (includesRaw(child, needle)) return true;
  }
  return false;
}

function captureFile() {
  const messages: string[] = [];
  const file = {
    message(reason: string) {
      messages.push(reason);
      return {};
    },
  };
  return { file, messages };
}

test("renders an inline SVG figure without a disclosure widget", async () => {
  const figure = await render("https://example.com/");

  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.dataQr, "rendered");
  assert.equal(figure.properties?.dataQrLevel, "M");
  assert.equal(figure.properties?.dataQrMargin, "1");
  assert.equal(figure.properties?.style, "--rb-qr-size:160px");
  assert.equal(includesRaw(figure, "<svg"), true);
  assert.equal(hasTag(figure, "details"), false);
  assert.equal(hasTag(figure, "summary"), false);
  assert.equal(hasTag(figure, "pre"), false);
});

test("shows the caption and payload as plain siblings, not a code block", async () => {
  const figure = await render("# caption: Project page\nhttps://example.com/");

  const figcaption = findElement(figure, "rb-qr__caption");
  assert.ok(figcaption);
  assert.equal(figcaption.tagName, "figcaption");

  const caption = findElement(figure, "rb-qr__caption-text");
  assert.ok(caption);
  assert.equal(getTextContent(caption), "Project page");

  const source = findElement(figure, "rb-qr__source");
  assert.ok(source);
  assert.equal(source.tagName, "a");
  assert.equal(source.properties?.href, "https://example.com/");
  assert.equal(getTextContent(source), "https://example.com/");

  const canvas = findElement(figure, "rb-qr__canvas");
  assert.ok(canvas);
  assert.equal(canvas.properties?.ariaLabelledby, caption.properties?.id);
  assert.equal(canvas.properties?.ariaLabel, undefined);

  assert.deepEqual(figcaption.children?.slice(0, 2), [caption, source]);
  assert.equal(getTextContent(figure).includes("# caption:"), false);
});

test("renders without a caption but keeps the payload readable", async () => {
  const figure = await render("https://example.com/");

  assert.equal(findElement(figure, "rb-qr__caption-text"), null);
  assert.ok(findElement(figure, "rb-qr__caption"));

  const canvas = findElement(figure, "rb-qr__canvas");
  assert.equal(canvas?.properties?.ariaLabel, "QR code");
  assert.equal(canvas?.properties?.ariaLabelledby, undefined);

  const source = findElement(figure, "rb-qr__source");
  assert.equal(source?.tagName, "a");
  assert.equal(getTextContent(source ?? figure), "https://example.com/");
});

test("reads a caption from the code-block title", async () => {
  const figure = await render(
    "https://example.com/",
    {},
    { title: "Engineered caption" },
  );

  const caption = findElement(figure, "rb-qr__caption-text");
  assert.ok(caption);
  assert.equal(getTextContent(caption), "Engineered caption");

  const source = findElement(figure, "rb-qr__source");
  assert.equal(getTextContent(source ?? figure), "https://example.com/");
});

test("links only navigable URI payloads", async () => {
  const linked = [
    "https://example.com/path",
    "http://example.com/",
    "mailto:hello@example.com",
    "tel:+81-3-1234-5678",
  ];
  const plain = [
    "plain text payload",
    "example.com",
    "javascript:alert(1)",
    "data:text/plain,hi",
  ];

  for (const payload of linked) {
    const figure = await render(payload);
    const source = findElement(figure, "rb-qr__source");
    assert.equal(source?.tagName, "a", payload);
    assert.equal(source?.properties?.href, payload, payload);
    assert.equal(getTextContent(source ?? figure), payload, payload);
  }

  for (const payload of plain) {
    const figure = await render(payload);
    const source = findElement(figure, "rb-qr__source");
    assert.equal(source?.tagName, "span", payload);
    assert.equal(source?.properties?.href, undefined, payload);
    assert.equal(getTextContent(source ?? figure), payload, payload);
  }
});

test("keeps a long payload intact instead of truncating it", async () => {
  const payload = `https://example.com/search?q=${"segment-".repeat(40)}end`;
  const figure = await render(payload);

  const source = findElement(figure, "rb-qr__source");
  assert.equal(source?.tagName, "a");
  assert.equal(source?.properties?.href, payload);
  assert.equal(getTextContent(source ?? figure), payload);
});

test("honours caption:false while still exposing the payload", async () => {
  const figure = await render("# caption: Hidden\nhttps://example.com/", {
    caption: false,
  });

  assert.equal(findElement(figure, "rb-qr__caption-text"), null);
  const source = findElement(figure, "rb-qr__source");
  assert.equal(getTextContent(source ?? figure), "https://example.com/");
});

test("applies the configured className and width", async () => {
  const figure = await render("https://example.com/", {
    className: "my-qr",
    width: 240,
  });

  assert.equal(figure.properties?.className, "my-qr");
  assert.equal(figure.properties?.style, "--rb-qr-size:240px");
  assert.ok(findElement(figure, "my-qr__canvas"));
  assert.ok(findElement(figure, "my-qr__caption"));
  assert.ok(findElement(figure, "my-qr__source"));
});

test("leaves fences in other languages untouched", async () => {
  const tree: HastNode = {
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
            properties: { className: ["language-js"] },
            children: [{ type: "text", value: "const x = 1;" }],
          },
        ],
      },
    ],
  };

  await rehypeQrCode(resolveQrCodeOptions({}))(tree, {});

  const first = firstChild(tree);
  assert.equal(first.tagName, "pre");
  assert.equal(hasTag(first, "figure"), false);
});

test("leaves an empty block untouched and reports a diagnostic", async () => {
  const { file, messages } = captureFile();
  const figure = await render("   ", {}, {}, file);

  assert.equal(figure.tagName, "pre");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Empty qr block/);
});

test("keeps the payload on encoder failures", async () => {
  const { file, messages } = captureFile();
  const payload = "x".repeat(5000);
  const figure = await render(payload, {}, {}, file);

  assert.equal(figure.properties?.dataQr, "error");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /could not be rendered/);

  const source = findElement(figure, "rb-qr__source");
  assert.equal(source?.tagName, "span");
  assert.equal(getTextContent(source ?? figure), payload);
});
