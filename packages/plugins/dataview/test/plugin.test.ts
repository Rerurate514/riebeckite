import assert from "node:assert/strict";
import { test } from "node:test";
import { dataview } from "../index.ts";

test("registers dataview runtime dependencies and validates options", () => {
  const plugin = dataview({ language: "query", limit: 10 });

  assert.equal(plugin.name, "dataview");
  assert.equal(plugin.processedContentCache?.version, "dataview-v1");
  assert.deepEqual(plugin.contentOutputDependencies, [{ type: "global" }]);
  assert.deepEqual(plugin.provides, ["content.dataview"]);
  assert.equal(
    plugin.assets?.[0]?.moduleSpecifier,
    "@riebeckite/plugin-dataview/style.css",
  );
  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      className: " ",
      language: 1,
      hideFallback: "yes",
      limit: Number.NaN,
    } as never),
    [
      { path: "className", message: "Expected a non-empty string." },
      { path: "language", message: "Expected a non-empty string." },
      { path: "hideFallback", message: "Expected a boolean." },
      { path: "limit", message: "Expected a non-negative finite number." },
    ],
  );
});
