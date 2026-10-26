import assert from "node:assert/strict";
import { test } from "node:test";
import { codeEnhance } from "../index.ts";

test("codeEnhance forwards copy label overrides to the client entry", () => {
  const entry = codeEnhance({
    copyLabel: "コピー",
    copiedLabel: "コピーしました",
  }).clientEntries?.[0];

  assert.deepEqual(entry?.publicConfig, {
    copyLabel: "コピー",
    copiedLabel: "コピーしました",
  });
});
