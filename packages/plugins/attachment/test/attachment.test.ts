import assert from "node:assert/strict";
import { test } from "node:test";
import type { PluginRenderContext } from "@riebeckite/core";
import { attachment } from "../index.ts";

function makeContext(
  overrides: Partial<PluginRenderContext> = {},
): PluginRenderContext {
  return {
    kind: "attachment",
    path: "attachments/report.pdf",
    raw: "report.pdf",
    label: "",
    url: "/attachments/report.pdf",
    embed: true,
    ...overrides,
  } as unknown as PluginRenderContext;
}

async function render(
  overrides: Partial<PluginRenderContext> = {},
): Promise<string> {
  const renderer = attachment().renderers?.[0];
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

  assert.ok(html.includes(">report.pdf</a>"), html);
});
