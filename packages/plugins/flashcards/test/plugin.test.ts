import assert from "node:assert/strict";
import { test } from "node:test";
import { flashcards } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(
    flashcards().validateOptions?.({ shuffle: "yes" } as never),
    [{ path: "shuffle", message: "Expected a boolean." }],
  );
});
