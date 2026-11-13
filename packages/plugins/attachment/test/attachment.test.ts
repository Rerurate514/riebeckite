import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentSource,
  createPluginContext,
  type PluginRenderContext,
} from "@riebeckite/core";
import { type AttachmentOptions, attachment } from "../index.ts";

function makeContentSource(
  files: Record<string, string | Uint8Array>,
): ContentSource {
  return {
    scan: async () => Object.keys(files).map((path) => ({ path })),
    read: async (entry) => {
      const content = files[entry.path];
      if (content === undefined) throw new Error(`missing ${entry.path}`);
      return content;
    },
  };
}

function makeContext(
  overrides: Partial<PluginRenderContext> = {},
): PluginRenderContext {
  return {
    ...createPluginContext(),
    kind: "attachment",
    path: "attachments/report.pdf",
    raw: "report.pdf",
    label: "",
    url: "/attachments/report.pdf",
    embed: true,
    ...overrides,
  };
}

async function render(
  overrides: Partial<PluginRenderContext> = {},
  options: AttachmentOptions = {},
): Promise<string> {
  const renderer = attachment(options).renderers?.[0];
  assert.ok(renderer, "attachment plugin should register a renderer");

  const html = await renderer.render(makeContext(overrides));
  assert.ok(html !== null, "attachment renderer should return HTML");
  return html;
}

test("embed download link falls back to an English label", async () => {
  const html = await render({ embed: true });

  assert.ok(html.includes(">Download</a>"), html);
  assert.doesNotMatch(html, /[\u3040-\u30ff\u4e00-\u9faf]/);
});

test("embed download link keeps an explicit label", async () => {
  const html = await render({ embed: true, label: "仕様書" });

  assert.ok(html.includes(">仕様書</a>"), html);
});

test("non-embed link falls back to the file name", async () => {
  const html = await render({ embed: false });

  assert.match(html, /class="rr-attachment-link"/);
  assert.ok(html.includes(">report.pdf</a>"), html);
});

test("text attachments render an escaped code block preview with a footer", async () => {
  const html = await render({
    path: "attachments/memo.txt",
    url: "/attachments/memo.txt",
    label: "メモ",
    contentSource: makeContentSource({
      "attachments/memo.txt": "<b>memo</b>",
    }),
  });

  assert.match(html, /class="rr-attachment rr-attachment--text"/);
  assert.ok(
    html.includes('<code class="language-txt">&lt;b&gt;memo&lt;/b&gt;</code>'),
  );
  assert.ok(html.includes('<span class="rr-attachment__name">memo.txt</span>'));
  assert.ok(html.includes('<span class="rr-attachment__format">TXT</span>'));
  assert.ok(html.includes('<span class="rr-attachment__size">11 B</span>'));
  assert.ok(html.includes(">メモ</a>"));
});

test("non-embed text attachments keep the download link", async () => {
  const html = await render({
    embed: false,
    path: "attachments/memo.txt",
    contentSource: makeContentSource({ "attachments/memo.txt": "memo" }),
  });

  assert.match(html, /class="rr-attachment-link"/);
  assert.doesNotMatch(html, /rr-attachment__preview/);
});

test("binary, oversized, and disabled previews fall back to the card", async () => {
  const binary = await render({
    path: "attachments/memo.txt",
    contentSource: makeContentSource({
      "attachments/memo.txt": new Uint8Array([1, 0, 2]),
    }),
  });
  assert.doesNotMatch(binary, /rr-attachment__preview/);
  assert.match(binary, /class="rr-attachment"/);

  const oversized = await render({
    path: "attachments/memo.txt",
    contentSource: makeContentSource({
      "attachments/memo.txt": "a".repeat(256 * 1024 + 1),
    }),
  });
  assert.doesNotMatch(oversized, /rr-attachment__preview/);

  const disabled = await render(
    {
      path: "attachments/memo.txt",
      contentSource: makeContentSource({ "attachments/memo.txt": "memo" }),
    },
    { preview: false },
  );
  assert.doesNotMatch(disabled, /rr-attachment__preview/);
});
