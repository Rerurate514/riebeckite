import assert from "node:assert/strict";
import { test } from "node:test";
import { pdf } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(pdf().validateOptions?.({ initialPage: 0 } as never), [
    { path: "initialPage", message: "Expected a positive integer." },
  ]);
});
