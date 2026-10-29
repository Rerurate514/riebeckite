import assert from "node:assert/strict";
import { test } from "node:test";
import { vegaLite } from "../index.js";

test("registers Vega-Lite and rejects invalid options", () => {
  const plugin = vegaLite();
  assert.equal(plugin.name, "vega-lite");
  assert.equal(plugin.processedContentCache?.version, "vega-lite-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initVegaLite");
  assert.deepEqual(plugin.validateOptions?.({ renderer: "webgl" } as never), [
    { path: "renderer", message: 'Expected "canvas" or "svg".' },
  ]);
});
