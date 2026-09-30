import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CODE_ANNOTATIONS_OPTIONS,
  resolveCodeAnnotationsOptions,
} from "../index.ts";

test("resolveCodeAnnotationsOptions applies the documented defaults", () => {
  const resolved = resolveCodeAnnotationsOptions();

  assert.deepEqual(resolved, {
    className: "rb-code",
    lineClassName: "rb-code__line",
    highlightClassName: "rb-code__line--highlighted",
    addedClassName: "rb-code__line--added",
    removedClassName: "rb-code__line--removed",
    focusClassName: "rb-code__line--focused",
  });
  assert.equal(resolved.className, DEFAULT_CODE_ANNOTATIONS_OPTIONS.className);
});

test("resolveCodeAnnotationsOptions keeps overrides and trims language", () => {
  const resolved = resolveCodeAnnotationsOptions({
    className: "code",
    removedClassName: "gone",
    language: "  ts  ",
  });

  assert.equal(resolved.className, "code");
  assert.equal(resolved.removedClassName, "gone");
  assert.equal(resolved.lineClassName, "rb-code__line");
  assert.equal(resolved.language, "ts");
  assert.equal(
    resolveCodeAnnotationsOptions({ language: "   " }).language,
    undefined,
  );
});
