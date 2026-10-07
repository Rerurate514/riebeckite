import assert from "node:assert/strict";
import { test } from "node:test";
import type { Root } from "mdast";
import { remarkAutoCardLink } from "../index.ts";

type Child = Root["children"][number];

function transform(value: string, className?: string): Child[] {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "code",
        lang: "cardlink",
        meta: null,
        value,
      },
    ],
  };
  remarkAutoCardLink(className ? { className } : {})(tree);
  return tree.children;
}

function render(value: string, className?: string): string {
  const children = transform(value, className);
  assert.equal(children.length, 1);
  const node = children[0] as { type?: string; value?: string };
  assert.equal(node.type, "html");
  return node.value ?? "";
}

test("renders an upstream cardlink block with container, card and copy button", () => {
  const html = render(
    [
      "url: https://example.com/article",
      'title: "Example Article"',
      'description: "An article about examples."',
      "host: example.com",
      "favicon: https://example.com/favicon.ico",
      "image: https://example.com/og.png",
    ].join("\n"),
  );

  assert.ok(html.startsWith('<div class="rr-cardlink">'));
  assert.ok(
    html.includes(
      '<a class="rr-cardlink__card" href="https://example.com/article" target="_blank" rel="noopener noreferrer">',
    ),
  );
  assert.ok(
    html.includes(
      '<span class="rr-cardlink__image-frame"><img class="rr-cardlink__image" src="https://example.com/og.png"',
    ),
  );
  assert.ok(
    html.includes('<span class="rr-cardlink__title">Example Article</span>'),
  );
  assert.ok(
    html.includes(
      '<span class="rr-cardlink__description">An article about examples.</span>',
    ),
  );
  assert.ok(
    html.includes(
      '<img class="rr-cardlink__favicon" src="https://example.com/favicon.ico"',
    ),
  );
  assert.ok(
    html.includes('<span class="rr-cardlink__host">example.com</span>'),
  );
  assert.ok(
    html.includes(
      '<button type="button" class="rr-cardlink__copy" data-rr-cardlink-copy="https://example.com/article"',
    ),
  );
  assert.ok(
    html.includes('<span class="rr-cardlink__copy-label">Copy URL</span>'),
  );
  assert.ok(!html.includes("--no-image"));
});

test("unescapes quoted quotes inside a title", () => {
  const html = render(
    ["url: https://example.com/article", 'title: "He said \\"hi\\""'].join(
      "\n",
    ),
  );

  assert.ok(
    html.includes(
      '<span class="rr-cardlink__title">He said &quot;hi&quot;</span>',
    ),
  );
});

test("escapes special characters in unquoted values", () => {
  const html = render(
    ["url: https://example.com/article", "title: A <b> & more"].join("\n"),
  );

  assert.ok(html.includes("A &lt;b&gt; &amp; more"));
});

test("leaves the code block untouched when url is missing", () => {
  const children = transform(['title: "No URL"'].join("\n"));

  assert.equal(children.length, 1);
  assert.equal(children[0].type, "code");
});

test("derives the host from the url hostname when host is missing", () => {
  const html = render("url: https://example.com/");

  assert.ok(
    html.includes(
      '<span class="rr-cardlink__title">https://example.com/</span>',
    ),
  );
  assert.ok(
    html.includes('<span class="rr-cardlink__host">example.com</span>'),
  );
});

test("prefers the explicit host field over the url hostname", () => {
  const html = render(
    ["url: https://example.com/article", "host: www.example.org"].join("\n"),
  );

  assert.ok(
    html.includes('<span class="rr-cardlink__host">www.example.org</span>'),
  );
  assert.ok(
    html.includes(
      '<a class="rr-cardlink__card" href="https://example.com/article"',
    ),
  );
});

test("falls back to the raw url as host for malformed urls", () => {
  const html = render("url: https://exa mple.com/article");

  assert.ok(
    html.includes(
      '<span class="rr-cardlink__host">https://exa mple.com/article</span>',
    ),
  );
});

test("uses the raw url as host for scheme-less urls", () => {
  const html = render("url: example.com/article");

  assert.ok(
    html.includes('<span class="rr-cardlink__host">example.com/article</span>'),
  );
});

test("drops images with an unsafe scheme", () => {
  const html = render(
    [
      "url: https://example.com/article",
      "host: example.com",
      "image: javascript:alert(1)",
    ].join("\n"),
  );

  assert.ok(html.includes("--no-image"));
  assert.ok(!html.includes("__image-frame"));
});

test("leaves the block untouched for non-http urls", () => {
  const children = transform("url: ftp://example.com/file");

  assert.equal(children.length, 1);
  assert.equal(children[0].type, "code");
});

test("applies the configured className to the container", () => {
  const html = render(
    [
      "url: https://example.com/article",
      "image: https://example.com/og.png",
    ].join("\n"),
    "media-card",
  );

  assert.ok(html.startsWith('<div class="rr-cardlink media-card">'));
});
