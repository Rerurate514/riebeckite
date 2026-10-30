import assert from "node:assert/strict";
import { test } from "node:test";
import { graphviz } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(graphviz().validateOptions?.({ engine: "grid" } as never), [
    {
      path: "engine",
      message: 'Expected "dot", "neato", "fdp", "sfdp", "circo", or "twopi".',
    },
  ]);
});
