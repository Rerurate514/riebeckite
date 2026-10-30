import assert from "node:assert/strict";
import { test } from "node:test";
import { ux } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(ux().validateOptions?.({ progress: "yes" } as never), [
    { path: "progress", message: "Expected a boolean." },
  ]);
});
