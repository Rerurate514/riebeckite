import assert from "node:assert/strict";
import { test } from "node:test";
import { media } from "../index.js";

test("registers media rendering only for supported attachments", () => {
  const plugin = media();
  assert.equal(plugin.name, "media");
  assert.equal(plugin.processedContentCache?.version, "media-v1");
  const render = plugin.renderers?.[0]?.render;
  assert.equal(typeof render, "function");
  assert.equal(
    render?.({ kind: "attachment", path: "note.txt" } as never),
    null,
  );
});
