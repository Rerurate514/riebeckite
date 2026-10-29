import assert from "node:assert/strict";
import { test } from "node:test";
import { graphviz } from "../index.js";

test("registers Graphviz and rejects invalid options", () => {
  const plugin = graphviz();
  assert.equal(plugin.name, "graphviz");
  assert.equal(plugin.processedContentCache?.version, "graphviz-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initGraphvizDiagrams");
  assert.deepEqual(plugin.validateOptions?.({ engine: "grid" } as never), [
    {
      path: "engine",
      message: 'Expected "dot", "neato", "fdp", "sfdp", "circo", or "twopi".',
    },
  ]);
});
