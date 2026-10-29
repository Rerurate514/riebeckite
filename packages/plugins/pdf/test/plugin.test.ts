import assert from "node:assert/strict";
import { test } from "node:test";
import { pdf } from "../index.js";

test("registers PDF rendering and rejects invalid options", () => {
  const plugin = pdf();
  assert.equal(plugin.name, "pdf");
  assert.equal(plugin.processedContentCache?.version, "pdf-v1");
  assert.equal(plugin.renderers?.[0]?.name, "pdf-viewer");
  assert.deepEqual(plugin.validateOptions?.({ initialPage: 0 } as never), [
    { path: "initialPage", message: "Expected a positive integer." },
  ]);
});
