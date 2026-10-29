import assert from "node:assert/strict";
import { test } from "node:test";
import { markmap } from "../index.js";

test("registers Markmap and rejects invalid options", () => {
  const plugin = markmap();
  assert.equal(plugin.name, "markmap");
  assert.equal(plugin.processedContentCache?.version, "markmap-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initMarkmap");
  assert.deepEqual(plugin.validateOptions?.({ height: 0 } as never), [
    { path: "height", message: "Expected a positive number." },
  ]);
});
