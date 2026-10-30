import assert from "node:assert/strict";
import { test } from "node:test";
import { wavedrom } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(wavedrom().validateOptions?.({ skin: "wide" } as never), [
    { path: "skin", message: 'Expected "default", "narrow", or "lowkey".' },
  ]);
});
