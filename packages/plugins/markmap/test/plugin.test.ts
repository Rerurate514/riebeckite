import assert from "node:assert/strict";
import { test } from "node:test";
import { markmap } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(markmap().validateOptions?.({ height: 0 } as never), [
    { path: "height", message: "Expected a positive number." },
  ]);
});
