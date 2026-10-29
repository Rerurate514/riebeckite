import assert from "node:assert/strict";
import { test } from "node:test";
import { ux } from "../index.js";

test("registers UX enhancements and rejects invalid options", () => {
  const plugin = ux();
  assert.equal(plugin.name, "ux");
  assert.equal(plugin.processedContentCache?.version, "ux-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initUx");
  assert.deepEqual(plugin.validateOptions?.({ progress: "yes" } as never), [
    { path: "progress", message: "Expected a boolean." },
  ]);
});
