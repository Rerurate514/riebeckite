import assert from "node:assert/strict";
import { test } from "node:test";
import {
  codeEnhance,
  DEFAULT_COPIED_LABEL,
  DEFAULT_COPY_LABEL,
} from "../index.ts";

test("codeEnhance forwards the default copy labels to the client entry", () => {
  const entry = codeEnhance().clientEntries?.[0];

  assert.deepEqual(entry?.publicConfig, {
    copyLabel: DEFAULT_COPY_LABEL,
    copiedLabel: DEFAULT_COPIED_LABEL,
  });
});

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

test("codeEnhance defaults the label that is not overridden", () => {
  const entry = codeEnhance({ copiedLabel: "Done" }).clientEntries?.[0];

  assert.deepEqual(entry?.publicConfig, {
    copyLabel: DEFAULT_COPY_LABEL,
    copiedLabel: "Done",
  });
});
